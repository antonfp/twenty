import { Injectable } from '@nestjs/common';

import crypto from 'crypto';

import { isNonEmptyString } from '@sniptt/guards';
import { isDefined } from 'twenty-shared/utils';

import { type PrintDocumentType } from 'src/engine/core-modules/erp/constants/print-document-type.const';
import { extractLineBlockTemplate } from 'src/engine/core-modules/erp/utils/fill-print-template.util';
import { GlobalWorkspaceOrmManager } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-orm.manager';
import { buildSystemAuthContext } from 'src/engine/twenty-orm/utils/build-system-auth-context.util';

const PRINT_TEMPLATE_OBJECT_NAME = 'printTemplate';
const BYPASS_PERMISSIONS = { shouldBypassPermissionChecks: true } as const;
// Same reasoning as BankStatementImportService.SYSTEM_ACTOR: writes here
// happen outside the normal GraphQL create/update path (MCP tool call), so
// this stamps its own actor rather than leaving createdBy/updatedBy unset.
const SYSTEM_ACTOR = { source: 'SYSTEM', name: 'ERPilot', context: {} };

type PrintTemplateRecord = Record<string, unknown> & { id: string };

export type ResolvedPrintTemplate = {
  html: string;
  source: 'custom' | 'built-in';
  fallbackReason: string | null;
};

const asText = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

// Shared by the sales-invoice (SCHET) and sales-shipment (UPD) print services
// and by the print-template MCP tools — the only place that knows how a
// workspace printTemplate override is looked up, sanity-checked and written.
@Injectable()
export class PrintTemplateService {
  constructor(
    private readonly globalWorkspaceOrmManager: GlobalWorkspaceOrmManager,
  ) {}

  // Most recently created active record for this documentType — «most
  // recent wins» per the ruling when several are (mistakenly) active at once.
  async findActiveTemplate(
    workspaceId: string,
    documentType: PrintDocumentType,
  ): Promise<PrintTemplateRecord | null> {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const repository =
          await this.globalWorkspaceOrmManager.getRepository<PrintTemplateRecord>(
            workspaceId,
            PRINT_TEMPLATE_OBJECT_NAME,
            BYPASS_PERMISSIONS,
          );
        const candidates = await repository.findBy({
          documentType,
          isActive: true,
        });

        return this.mostRecent(candidates);
      },
      buildSystemAuthContext(workspaceId),
    );
  }

  // Sanity-checks an active override before trusting it to render: blank
  // content or a missing <!-- BEGIN line -->…<!-- END line --> block can't
  // safely replace the built-in template (fillPrintTemplate would silently
  // drop the line rows) — fall back and say why, so render_print_preview can
  // surface it instead of a document quietly losing its item table.
  resolveTemplateHtml(
    activeOverride: PrintTemplateRecord | null,
    builtInHtml: string,
  ): ResolvedPrintTemplate {
    if (!isDefined(activeOverride)) {
      return { html: builtInHtml, source: 'built-in', fallbackReason: null };
    }

    const templateText = asText(activeOverride.template).trim();

    if (!isNonEmptyString(templateText)) {
      return {
        html: builtInHtml,
        source: 'built-in',
        fallbackReason:
          'Активный шаблон печати пуст — используется встроенный шаблон.',
      };
    }

    if (!isNonEmptyString(extractLineBlockTemplate(templateText))) {
      return {
        html: builtInHtml,
        source: 'built-in',
        fallbackReason:
          'В активном шаблоне печати нет блока строк <!-- BEGIN line -->…<!-- END line -->' +
          ' — используется встроенный шаблон.',
      };
    }

    return { html: templateText, source: 'custom', fallbackReason: null };
  }

  // update_print_template: updates the most recently touched printTemplate
  // record for this documentType if one exists, else creates it — either way
  // the result is active (calling this IS "set the current override").
  async createOrUpdateActiveTemplate(
    workspaceId: string,
    documentType: PrintDocumentType,
    templateHtml: string,
  ): Promise<{ id: string }> {
    return this.globalWorkspaceOrmManager.executeInWorkspaceContext(
      async () => {
        const repository =
          await this.globalWorkspaceOrmManager.getRepository<PrintTemplateRecord>(
            workspaceId,
            PRINT_TEMPLATE_OBJECT_NAME,
            BYPASS_PERMISSIONS,
          );
        const existing = this.mostRecent(
          await repository.findBy({ documentType }),
        );

        if (isDefined(existing)) {
          await repository.update(existing.id, {
            template: templateHtml,
            isActive: true,
            updatedBy: SYSTEM_ACTOR,
          });

          return { id: existing.id };
        }

        // WorkspaceRepository.save() resolves to formatData()'s output, not
        // a DB read-back — it does not carry a server-generated id back (see
        // BankStatementImportService for the same finding), so the id is
        // generated here and passed in explicitly.
        const id = crypto.randomUUID();

        await repository.save({
          id,
          name: `Шаблон печати: ${documentType}`,
          documentType,
          template: templateHtml,
          isActive: true,
          createdBy: SYSTEM_ACTOR,
          updatedBy: SYSTEM_ACTOR,
        });

        return { id };
      },
      buildSystemAuthContext(workspaceId),
    );
  }

  private mostRecent(
    candidates: PrintTemplateRecord[],
  ): PrintTemplateRecord | null {
    if (candidates.length === 0) {
      return null;
    }

    return [...candidates].sort((first, second) =>
      asText(second.createdAt).localeCompare(asText(first.createdAt)),
    )[0];
  }
}
