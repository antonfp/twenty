import { Injectable } from '@nestjs/common';

import { formatDocumentNumber } from 'src/engine/core-modules/erp/utils/format-document-number.util';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';
import { escapeIdentifier } from 'src/engine/workspace-manager/workspace-migration/utils/remove-sql-injection.util';

export const ERP_SEQUENCE_TABLE_NAME = '_erp_sequence';

type ExecuteRawQuery = (
  sql: string,
  parameters?: unknown[],
) => Promise<Record<string, unknown>[]>;

export type NextDocumentNumberArgs = {
  workspaceId: string;
  docType: string;
  prefix: string;
  executeRawQuery: ExecuteRawQuery;
};

@Injectable()
export class DocumentNumberingService {
  // Runs inside the caller's transaction: the upsert's row lock serializes
  // concurrent numbering per docType, and a rollback returns the number.
  async nextDocumentNumber({
    workspaceId,
    docType,
    prefix,
    executeRawQuery,
  }: NextDocumentNumberArgs): Promise<string> {
    const sequenceTableReference = `${escapeIdentifier(
      getWorkspaceSchemaName(workspaceId),
    )}.${escapeIdentifier(ERP_SEQUENCE_TABLE_NAME)}`;

    await executeRawQuery(
      `CREATE TABLE IF NOT EXISTS ${sequenceTableReference} ("docType" text PRIMARY KEY, "lastNumber" bigint NOT NULL DEFAULT 0)`,
    );

    const rows = await executeRawQuery(
      `INSERT INTO ${sequenceTableReference} ("docType", "lastNumber") VALUES ($1, 1)
       ON CONFLICT ("docType") DO UPDATE SET "lastNumber" = ${escapeIdentifier(ERP_SEQUENCE_TABLE_NAME)}."lastNumber" + 1
       RETURNING "lastNumber"`,
      [docType],
    );

    // node-postgres returns bigint columns as strings
    const lastNumber = Number(rows[0]?.lastNumber);

    return formatDocumentNumber(prefix, lastNumber);
  }
}
