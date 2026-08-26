import { ErpPostingException } from 'src/engine/core-modules/erp/erp-posting.exception';
import { type DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentLineRecord,
  type ErpDocumentRecord,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { ManualEntryPostingRulesService } from 'src/engine/core-modules/erp-accounting/services/manual-entry-posting-rules.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const MANUAL_ENTRY_ID = 'manual-entry-1';

const rubles = (amount: number) => ({
  amountMicros: Math.round(amount * 1_000_000),
  currencyCode: 'RUB',
});

const createMockRepository = () => ({
  update: jest.fn().mockResolvedValue(undefined),
});

const createContext = (
  repositories: Record<string, unknown> = {},
): PostingContext => ({
  workspaceId: WORKSPACE_ID,
  documentObjectName: 'manualEntry',
  documentId: MANUAL_ENTRY_ID,
  postingDate: '2026-08-20',
  transactionScope: {
    getRepository: jest.fn(
      (objectName: string) => repositories[objectName],
    ) as never,
    executeRawQuery: jest.fn().mockResolvedValue([]),
  },
});

const createService = (documentNumber = 'ME-000007') => {
  const documentNumberingService = {
    nextDocumentNumber: jest.fn().mockResolvedValue(documentNumber),
  };

  return {
    service: new ManualEntryPostingRulesService(
      documentNumberingService as unknown as DocumentNumberingService,
    ),
    documentNumberingService,
  };
};

const manualEntry = (
  overrides: Record<string, unknown> = {},
): ErpDocumentRecord => ({
  id: MANUAL_ENTRY_ID,
  organizationId: 'organization-1',
  number: null,
  ...overrides,
});

const line = (
  overrides: Record<string, unknown> = {},
): ErpDocumentLineRecord => ({
  id: 'line-1',
  name: 'Хознужды',
  debitAccountId: 'account-26',
  creditAccountId: 'account-71',
  amount: rubles(500),
  ...overrides,
});

describe('ManualEntryPostingRulesService', () => {
  describe('validate', () => {
    it.each([
      ['no lines', []],
      ['a zero amount', [line({ amount: rubles(0) })]],
      ['a negative amount', [line({ amount: rubles(-1) })]],
      ['a missing debit account', [line({ debitAccountId: null })]],
      ['a missing credit account', [line({ creditAccountId: null })]],
      [
        'the same debit and credit account',
        [line({ creditAccountId: 'account-26' })],
      ],
    ])('rejects a manual entry with %s', (_label, lines) => {
      const { service } = createService();

      expect(() =>
        service.validate(
          createContext(),
          manualEntry(),
          lines as ErpDocumentLineRecord[],
        ),
      ).toThrow(ErpPostingException);
    });

    it('accepts a valid manual entry', () => {
      const { service } = createService();

      expect(() =>
        service.validate(createContext(), manualEntry(), [line()]),
      ).not.toThrow();
    });
  });

  describe('getPartyEntries', () => {
    it('numbers the document with the ME- prefix, names it and returns no register rows', async () => {
      const repositories = { manualEntry: createMockRepository() };
      const { service, documentNumberingService } = createService();
      const context = createContext(repositories);

      const entries = await service.getPartyEntries(context, manualEntry(), []);

      expect(entries).toEqual([]);
      expect(documentNumberingService.nextDocumentNumber).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        docType: 'manualEntry',
        prefix: 'ME',
        executeRawQuery: context.transactionScope.executeRawQuery,
      });
      expect(repositories.manualEntry.update).toHaveBeenCalledWith(
        MANUAL_ENTRY_ID,
        {
          number: 'ME-000007',
          name: 'Ручная операция № ME-000007 от 20.08.2026',
        },
      );
    });

    it('keeps an existing document number', async () => {
      const repositories = { manualEntry: createMockRepository() };
      const { service, documentNumberingService } = createService();

      await service.getPartyEntries(
        createContext(repositories),
        manualEntry({ number: 'ME-000001' }),
        [],
      );

      expect(
        documentNumberingService.nextDocumentNumber,
      ).not.toHaveBeenCalled();
      expect(repositories.manualEntry.update).toHaveBeenCalledWith(
        MANUAL_ENTRY_ID,
        {
          number: 'ME-000001',
          name: 'Ручная операция № ME-000001 от 20.08.2026',
        },
      );
    });
  });
});
