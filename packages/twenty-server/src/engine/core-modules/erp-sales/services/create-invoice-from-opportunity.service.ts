import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import crypto from 'crypto';

import { isDefined } from 'twenty-shared/utils';

import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
import { type ErpDocumentRecord } from 'src/engine/core-modules/erp/types/posting.types';
import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import {
  currencyToKopecks,
  kopecksToCurrency,
  RUB_CURRENCY_CODE,
} from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const OPPORTUNITY_OBJECT_NAME = 'opportunity';
const ORGANIZATION_OBJECT_NAME = 'organization';
const SALES_INVOICE_OBJECT_NAME = 'salesInvoice';
const SALES_INVOICE_LINE_OBJECT_NAME = 'salesInvoiceLine';
const DEFAULT_VAT_RATE = 'VAT_22';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;
// Created outside the GraphQL create path (direct repository write), same
// reasoning as create-invoice-revision.service.ts / month-close.service.ts —
// stamps its own actor rather than leaving createdBy/updatedBy unset.
const SYSTEM_ACTOR = { source: 'SYSTEM', name: 'ERPilot', context: {} };

export type CreateInvoiceFromOpportunityResult = {
  success: true;
  id: string;
  opportunityId: string;
  // true when an already-existing DRAFT invoice for this opportunity was
  // returned instead of creating a new one (idempotency, see ruling below).
  wasExisting: boolean;
  message: string;
};

const asText = (value: unknown): string =>
  typeof value === 'string' ? value : '';

// Glue Сделка→Счёт (Task 8, ruling «Ruling (glue Сделка→Счёт)»): creates a
// DRAFT salesInvoice from a CRM opportunity — customer = deal's company,
// organization = the workspace's default (isDefault, else earliest by
// createdAt), one line «Услуги по сделке "<name>"» carrying the deal's whole
// amount. Idempotent like close_month's orphan-DRAFT reuse: a retry for the
// SAME opportunity with an already-open DRAFT invoice returns that invoice
// rather than piling up duplicates; once it's posted (or cancelled), the next
// call creates a fresh one — a deal can legally be split across several
// invoices (partial billing), just never two open drafts at once.
@Injectable()
export class CreateInvoiceFromOpportunityService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async createInvoiceFromOpportunity(
    workspaceId: string,
    opportunityId: string,
  ): Promise<CreateInvoiceFromOpportunityResult> {
    return this.runInWorkspaceTransaction(workspaceId, (scope) =>
      this.applyCreateInvoice(scope, opportunityId),
    );
  }

  private async applyCreateInvoice(
    scope: WorkspaceTransactionScope,
    opportunityId: string,
  ): Promise<CreateInvoiceFromOpportunityResult> {
    const opportunityRepository = scope.getRepository<ErpDocumentRecord>(
      OPPORTUNITY_OBJECT_NAME,
      BYPASS_PERMISSIONS,
    );
    const opportunity = await opportunityRepository.findOneBy({
      id: opportunityId,
    });

    if (!isDefined(opportunity)) {
      throw new NotFoundException(`Сделка «${opportunityId}» не найдена.`);
    }

    const companyId =
      typeof opportunity.companyId === 'string' ? opportunity.companyId : null;

    if (!isDefined(companyId)) {
      throw new BadRequestException('У сделки не указана компания.');
    }

    const invoiceRepository = scope.getRepository<ErpDocumentRecord>(
      SALES_INVOICE_OBJECT_NAME,
      BYPASS_PERMISSIONS,
    );

    // Idempotency (see class comment): reuse the deal's still-open DRAFT
    // invoice instead of creating a duplicate. Not withDeleted — a
    // soft-deleted draft was explicitly discarded by the accountant, so a
    // retry should create a fresh one, same reasoning as
    // create-invoice-revision.service.ts's existing-DRAFT-revision guard.
    const existingDraft = await invoiceRepository.findOne({
      where: { opportunityId, docStatus: DOC_STATUS.DRAFT },
    });

    if (isDefined(existingDraft) && typeof existingDraft.id === 'string') {
      return {
        success: true,
        id: existingDraft.id,
        opportunityId,
        wasExisting: true,
        message: `У сделки уже есть черновик счёта — возвращён существующий (id ${existingDraft.id}).`,
      };
    }

    const organizationRepository = scope.getRepository<ErpDocumentRecord>(
      ORGANIZATION_OBJECT_NAME,
      BYPASS_PERMISSIONS,
    );
    const organization =
      (await organizationRepository.findOne({ where: { isDefault: true } })) ??
      (await organizationRepository.findOne({
        order: { createdAt: 'ASC', id: 'ASC' },
      }));

    if (!isDefined(organization)) {
      throw new BadRequestException(
        'Нет ни одной организации — сначала создайте организацию.',
      );
    }

    const dealName = asText(opportunity.name);
    const invoiceId = crypto.randomUUID();

    await invoiceRepository.save({
      id: invoiceId,
      name: dealName || `Счёт по сделке ${opportunityId}`,
      docStatus: DOC_STATUS.DRAFT,
      organizationId: organization.id,
      customerId: companyId,
      comment: `Из сделки «${dealName}»`,
      opportunityId,
      createdBy: SYSTEM_ACTOR,
      updatedBy: SYSTEM_ACTOR,
    });

    const currencyCode =
      asText((opportunity.amount as CurrencyFieldValue)?.currencyCode) ||
      RUB_CURRENCY_CODE;
    const priceKopecks = currencyToKopecks(
      opportunity.amount as CurrencyFieldValue,
    );
    const priceCurrency = kopecksToCurrency(priceKopecks, currencyCode);

    const lineRepository = scope.getRepository<ErpDocumentRecord>(
      SALES_INVOICE_LINE_OBJECT_NAME,
      BYPASS_PERMISSIONS,
    );

    await lineRepository.save({
      id: crypto.randomUUID(),
      salesInvoiceId: invoiceId,
      name: `Услуги по сделке "${dealName}"`,
      quantity: 1,
      price: priceCurrency,
      vatRate: DEFAULT_VAT_RATE,
      amount: priceCurrency,
      position: 0,
      createdBy: SYSTEM_ACTOR,
      updatedBy: SYSTEM_ACTOR,
    });

    return {
      success: true,
      id: invoiceId,
      opportunityId,
      wasExisting: false,
      message: `Черновик счёта создан из сделки «${dealName}» (id ${invoiceId}).`,
    };
  }

  private async runInWorkspaceTransaction<TResult>(
    workspaceId: string,
    work: (transactionScope: WorkspaceTransactionScope) => Promise<TResult>,
  ): Promise<TResult> {
    const authContext = buildSystemAuthContext(workspaceId);

    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      () => this.globalWorkspaceOrmManager.runInWorkspaceTransaction(work),
      authContext,
    );
  }
}
