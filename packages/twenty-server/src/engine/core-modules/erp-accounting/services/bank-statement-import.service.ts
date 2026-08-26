import { Injectable, NotFoundException } from '@nestjs/common';

import crypto from 'crypto';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { DOC_STATUS } from 'src/engine/core-modules/erp/types/doc-status.type';
import { type ErpDocumentRecord } from 'src/engine/core-modules/erp/types/posting.types';
import { type CurrencyFieldValue } from 'src/engine/core-modules/erp-sales/types/erp-sales.types';
import {
  currencyToKopecks,
  kopecksToCurrency,
} from 'src/engine/core-modules/erp-sales/utils/erp-sales-money.util';
import { formatDateRuShort } from 'src/engine/core-modules/erp-sales/utils/format-ru.util';
import {
  decodeBankStatementBuffer,
  type ParsedBankStatementDocument,
  parseBankStatementText,
} from 'src/engine/core-modules/erp-accounting/utils/parse-bank-statement-file.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { type WorkspaceTransactionScope } from 'src/engine/twenty-orm/global-workspace-datasource/types/workspace-transaction-scope.type';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const ORGANIZATION_OBJECT_NAME = 'organization';
const COMPANY_OBJECT_NAME = 'company';
const PAYMENT_OBJECT_NAME = 'payment';
const SUPPLIER_PAYMENT_OBJECT_NAME = 'supplierPayment';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;
// Register rows stamp the same actor (see PostingService.insertRegisterRows);
// documents/companies created here bypass the normal GraphQL create path
// (which would stamp the calling user), so this import stamps its own.
const SYSTEM_ACTOR = { source: 'SYSTEM', name: 'ERPilot', context: {} };

const buildCommentPrefix = (number: string, dateRu: string): string =>
  `Импорт выписки: платёжка № ${number} от ${dateRu}`;

export type BankStatementImportCreatedEntry = {
  type: 'payment' | 'supplierPayment';
  id: string;
  number: string | null;
  amountKopecks: number;
  counterparty: string;
};

export type BankStatementImportSkippedEntry = {
  documentNumber: string;
  amountKopecks: number | null;
  reason: string;
};

export type BankStatementImportReport = {
  created: BankStatementImportCreatedEntry[];
  skipped: BankStatementImportSkippedEntry[];
  errors: string[];
};

type ImportOutcome =
  | { status: 'created'; entry: BankStatementImportCreatedEntry }
  | { status: 'skipped'; entry: BankStatementImportSkippedEntry };

// Импорт банковских выписок (Task 4, ruling): parses a 1CClientBankExchange
// file, resolves direction/counterparty per document and creates DRAFT
// payment/supplierPayment records — never posts them (бухгалтер проверит).
// Each document runs in its own workspace transaction so one bad row can't
// roll back the others; a file-level parse failure short-circuits before any
// transaction runs.
@Injectable()
export class BankStatementImportService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  async importStatement(
    workspaceId: string,
    organizationId: string,
    source: Buffer | string,
  ): Promise<BankStatementImportReport> {
    const text =
      typeof source === 'string' ? source : decodeBankStatementBuffer(source);
    const { documents, fileErrors } = parseBankStatementText(text);

    const created: BankStatementImportCreatedEntry[] = [];
    const skipped: BankStatementImportSkippedEntry[] = [];
    const errors: string[] = [...fileErrors];

    const organization = await this.loadOrganization(
      workspaceId,
      organizationId,
    );

    for (const doc of documents) {
      if (isDefined(doc.parseError)) {
        errors.push(`Платёжка № ${doc.number}: ${doc.parseError}`);
        continue;
      }

      try {
        const outcome = await this.importDocument(
          workspaceId,
          organization,
          doc,
        );

        if (outcome.status === 'created') {
          created.push(outcome.entry);
        } else {
          skipped.push(outcome.entry);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        errors.push(`Платёжка № ${doc.number}: ${message}`);
      }
    }

    return { created, skipped, errors };
  }

  private async loadOrganization(
    workspaceId: string,
    organizationId: string,
  ): Promise<ErpDocumentRecord> {
    return this.runInWorkspaceTransaction(workspaceId, async (scope) => {
      const organization = await scope
        .getRepository<ErpDocumentRecord>(
          ORGANIZATION_OBJECT_NAME,
          BYPASS_PERMISSIONS,
        )
        .findOneBy({ id: organizationId });

      if (!isDefined(organization)) {
        throw new NotFoundException(
          `Организация "${organizationId}" не найдена`,
        );
      }

      return organization;
    });
  }

  private async importDocument(
    workspaceId: string,
    organization: ErpDocumentRecord,
    doc: ParsedBankStatementDocument,
  ): Promise<ImportOutcome> {
    // parseError already filtered out by the caller, so these are guaranteed
    // non-null (see ParsedBankStatementDocument's parseError contract).
    const amountKopecks = doc.amountKopecks as number;
    const dateIso = doc.dateIso as string;

    const organizationInn =
      typeof organization.inn === 'string' ? organization.inn.trim() : '';
    const payeeIsUs =
      isNonEmptyString(organizationInn) && doc.payeeInn === organizationInn;
    const payerIsUs =
      isNonEmptyString(organizationInn) && doc.payerInn === organizationInn;

    if (payeeIsUs && payerIsUs) {
      return {
        status: 'skipped',
        entry: {
          documentNumber: doc.number,
          amountKopecks,
          reason:
            'Перевод между своими счетами: и плательщик, и получатель — эта организация.',
        },
      };
    }

    if (!payeeIsUs && !payerIsUs) {
      throw new Error(
        'Ни ИНН плательщика, ни ИНН получателя не совпадает с ИНН организации.',
      );
    }

    const direction: 'incoming' | 'outgoing' = payeeIsUs
      ? 'incoming'
      : 'outgoing';
    const objectName =
      direction === 'incoming' ? PAYMENT_OBJECT_NAME : SUPPLIER_PAYMENT_OBJECT_NAME;
    const counterpartyField = direction === 'incoming' ? 'payerId' : 'supplierId';
    const counterpartyInn = direction === 'incoming' ? doc.payerInn : doc.payeeInn;
    const counterpartyRawName =
      direction === 'incoming' ? doc.payerName : doc.payeeName;

    return this.runInWorkspaceTransaction(workspaceId, async (scope) => {
      const company = await this.resolveCompany(
        scope,
        counterpartyInn,
        counterpartyRawName,
      );

      const dateRu = formatDateRuShort(dateIso);
      const commentPrefix = buildCommentPrefix(doc.number, dateRu);

      const existing = await this.findExistingRecord(
        scope,
        objectName,
        counterpartyField,
        organization.id,
        company.id,
        commentPrefix,
        amountKopecks,
      );

      if (isDefined(existing)) {
        return {
          status: 'skipped' as const,
          entry: {
            documentNumber: doc.number,
            amountKopecks,
            reason: `Уже импортировано ранее (запись ${existing.id}).`,
          },
        };
      }

      const postingDateIso =
        (direction === 'incoming'
          ? doc.dateReceivedIso
          : doc.dateWrittenOffIso) ?? dateIso;
      const comment = doc.purpose
        ? `${commentPrefix}; ${doc.purpose}`
        : commentPrefix;
      const name = `Импорт: платёжка № ${doc.number} от ${dateRu}`;

      const documentRepository = scope.getRepository<ErpDocumentRecord>(
        objectName,
        BYPASS_PERMISSIONS,
      );
      // WorkspaceRepository.save() resolves to formatData()'s output, not a
      // DB read-back — it does not carry a server-generated id (verified
      // live: a company/document saved without an id came back with the
      // right columns in Postgres but an unreadable id on the JS object), so
      // the id is generated here and passed in explicitly.
      const documentId = crypto.randomUUID();

      await documentRepository.save({
        id: documentId,
        organizationId: organization.id,
        [counterpartyField]: company.id,
        amount: kopecksToCurrency(amountKopecks),
        docStatus: DOC_STATUS.DRAFT,
        postingDate: postingDateIso,
        paymentDate: postingDateIso,
        name,
        comment,
        createdBy: SYSTEM_ACTOR,
        updatedBy: SYSTEM_ACTOR,
      });

      return {
        status: 'created' as const,
        entry: {
          type: objectName as 'payment' | 'supplierPayment',
          id: documentId,
          number: null,
          amountKopecks,
          counterparty: company.name,
        },
      };
    });
  }

  // ponytail: full-scan per (organization, counterparty) pair, filtered in
  // JS by comment prefix + amount — fine at SMB import volumes (a handful of
  // statements a month); if one counterparty accumulates thousands of
  // payments, push the comment/amount filter into SQL instead.
  private async findExistingRecord(
    scope: WorkspaceTransactionScope,
    objectName: string,
    counterpartyField: string,
    organizationId: string,
    companyId: string,
    commentPrefix: string,
    amountKopecks: number,
  ): Promise<ErpDocumentRecord | null> {
    const candidates = await scope
      .getRepository<ErpDocumentRecord>(objectName, BYPASS_PERMISSIONS)
      .findBy({ organizationId, [counterpartyField]: companyId });

    return (
      candidates.find(
        (candidate) =>
          typeof candidate.comment === 'string' &&
          candidate.comment.startsWith(commentPrefix) &&
          currencyToKopecks(candidate.amount as CurrencyFieldValue) ===
            amountKopecks,
      ) ?? null
    );
  }

  private async resolveCompany(
    scope: WorkspaceTransactionScope,
    inn: string | null,
    rawName: string,
  ): Promise<{ id: string; name: string }> {
    const companyRepository = scope.getRepository<ErpDocumentRecord>(
      COMPANY_OBJECT_NAME,
      BYPASS_PERMISSIONS,
    );

    if (isNonEmptyString(inn)) {
      const existing = await companyRepository.findOneBy({ inn });

      if (isDefined(existing)) {
        return {
          id: existing.id,
          name: typeof existing.name === 'string' ? existing.name : '',
        };
      }
    }

    const cleanedName = this.stripInnKppPrefix(rawName);
    const name = isNonEmptyString(cleanedName)
      ? cleanedName
      : isNonEmptyString(inn)
        ? `Контрагент ИНН ${inn}`
        : 'Контрагент без ИНН';
    // Same reasoning as documentId in importDocument above: .save()'s
    // resolved value doesn't carry the generated id back, so it's generated
    // here instead.
    const companyId = crypto.randomUUID();

    await companyRepository.save({
      id: companyId,
      name,
      inn: inn ?? null,
      createdBy: SYSTEM_ACTOR,
      updatedBy: SYSTEM_ACTOR,
    });

    return { id: companyId, name };
  }

  // Плательщик1/Получатель1 are normally already clean short names, but the
  // full Плательщик/Получатель fallback can carry a "ИНН .../КПП ... Имя"
  // prefix — strip it defensively regardless of which field supplied rawName.
  private stripInnKppPrefix(raw: string): string {
    return raw.replace(/^ИНН\s*\d+(?:\/?\s*КПП\s*\d+)?\s*/iu, '').trim();
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
