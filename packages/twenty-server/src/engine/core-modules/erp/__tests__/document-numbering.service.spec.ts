import { DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import { formatDocumentNumber } from 'src/engine/core-modules/erp/utils/format-document-number.util';
import { getWorkspaceSchemaName } from 'src/engine/workspace-datasource/utils/get-workspace-schema-name.util';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

describe('formatDocumentNumber', () => {
  it('pads the sequence number to 6 digits', () => {
    expect(formatDocumentNumber('INV', 7)).toBe('INV-000007');
    expect(formatDocumentNumber('ПРД', 42)).toBe('ПРД-000042');
  });

  it('does not truncate numbers longer than 6 digits', () => {
    expect(formatDocumentNumber('INV', 1234567)).toBe('INV-1234567');
  });
});

describe('DocumentNumberingService', () => {
  it('creates the sequence table on first use and returns the formatted next number', async () => {
    const executeRawQuery = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ lastNumber: '42' }]);
    const service = new DocumentNumberingService();

    const documentNumber = await service.nextDocumentNumber({
      workspaceId: WORKSPACE_ID,
      docType: 'salesInvoice',
      prefix: 'INV',
      executeRawQuery,
    });

    expect(documentNumber).toBe('INV-000042');

    const expectedSchemaName = getWorkspaceSchemaName(WORKSPACE_ID);
    const [createTableSql] = executeRawQuery.mock.calls[0];

    expect(createTableSql).toContain('CREATE TABLE IF NOT EXISTS');
    expect(createTableSql).toContain(`"${expectedSchemaName}"."_erp_sequence"`);

    const [upsertSql, upsertParameters] = executeRawQuery.mock.calls[1];

    expect(upsertSql).toContain('ON CONFLICT ("docType")');
    expect(upsertSql).toContain('RETURNING "lastNumber"');
    expect(upsertParameters).toEqual(['salesInvoice']);
  });

  it('increments per docType through the sequence row', async () => {
    const executeRawQuery = jest
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ lastNumber: '1' }]);
    const service = new DocumentNumberingService();

    const documentNumber = await service.nextDocumentNumber({
      workspaceId: WORKSPACE_ID,
      docType: 'purchaseInvoice',
      prefix: 'ПОС',
      executeRawQuery,
    });

    expect(documentNumber).toBe('ПОС-000001');
  });
});
