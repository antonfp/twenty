import { ErpPostingException } from 'src/engine/core-modules/erp/erp-posting.exception';
import { type DocumentNumberingService } from 'src/engine/core-modules/erp/services/document-numbering.service';
import {
  type ErpDocumentRecord,
  type PostingContext,
} from 'src/engine/core-modules/erp/types/posting.types';
import { MonthClosePostingRulesService } from 'src/engine/core-modules/erp-accounting/services/month-close-posting-rules.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const MONTH_CLOSE_ID = 'month-close-1';
const ORGANIZATION_ID = 'organization-1';

const createMockRepository = (findOneResult: unknown = null) => ({
  findOne: jest.fn().mockResolvedValue(findOneResult),
  update: jest.fn().mockResolvedValue(undefined),
});

const createContext = (
  repositories: Record<string, unknown> = {},
): PostingContext => ({
  workspaceId: WORKSPACE_ID,
  documentObjectName: 'monthClose',
  documentId: MONTH_CLOSE_ID,
  postingDate: '2026-08-31',
  transactionScope: {
    getRepository: jest.fn((objectName: string) => repositories[objectName]),
    executeRawQuery: jest.fn().mockResolvedValue([]),
  } as never,
});

const createService = (documentNumber = 'MC-000003') => {
  const documentNumberingService = {
    nextDocumentNumber: jest.fn().mockResolvedValue(documentNumber),
  };

  return {
    service: new MonthClosePostingRulesService(
      documentNumberingService as unknown as DocumentNumberingService,
    ),
    documentNumberingService,
  };
};

const monthClose = (
  overrides: Record<string, unknown> = {},
): ErpDocumentRecord => ({
  id: MONTH_CLOSE_ID,
  organizationId: ORGANIZATION_ID,
  period: '2026-08-01',
  isYearReformation: false,
  number: null,
  ...overrides,
});

describe('MonthClosePostingRulesService', () => {
  describe('validate', () => {
    it('rejects a document with no organization', async () => {
      const { service } = createService();

      await expect(
        service.validate(
          createContext({ monthClose: createMockRepository() }),
          monthClose({ organizationId: null }),
          [],
        ),
      ).rejects.toThrow(ErpPostingException);
    });

    it.each([
      ['not set', null],
      ['not the first of the month', '2026-08-15'],
    ])('rejects a period that is %s', async (_label, period) => {
      const { service } = createService();

      await expect(
        service.validate(
          createContext({ monthClose: createMockRepository() }),
          monthClose({ period }),
          [],
        ),
      ).rejects.toThrow(ErpPostingException);
    });

    it('rejects a future month', async () => {
      const { service } = createService();

      await expect(
        service.validate(
          createContext({ monthClose: createMockRepository() }),
          // "today" in this environment is 2026-08-27 — 2027-01 is safely
          // in the future regardless of when this suite runs this year.
          monthClose({ period: '2027-01-01' }),
          [],
        ),
      ).rejects.toThrow(ErpPostingException);
    });

    it('accepts the current month (not yet over, still not "future")', async () => {
      const { service } = createService();

      await expect(
        service.validate(
          createContext({ monthClose: createMockRepository() }),
          monthClose({ period: '2026-08-01' }),
          [],
        ),
      ).resolves.not.toThrow();
    });

    it('rejects isYearReformation for a non-December period', async () => {
      const { service } = createService();

      await expect(
        service.validate(
          createContext({ monthClose: createMockRepository() }),
          monthClose({ period: '2026-08-01', isYearReformation: true }),
          [],
        ),
      ).rejects.toThrow(ErpPostingException);
    });

    it('accepts isYearReformation for December', async () => {
      const { service } = createService();

      await expect(
        service.validate(
          createContext({ monthClose: createMockRepository() }),
          // A past December — reformation only rejects on month-of-year, but
          // validate() also independently rejects future periods, and this
          // suite runs "today" (2026-08-27) after August 2026 but before
          // December 2026.
          monthClose({ period: '2025-12-01', isYearReformation: true }),
          [],
        ),
      ).resolves.not.toThrow();
    });

    // Повторное закрытие: RU-отказ по поиску POSTED monthClose организации
    // за period. withDeleted-урок — see sales-invoice-posting-rules.service.ts
    // for the same lesson: a soft-deleted POSTED record must still block.
    it('rejects when the month is already closed (POSTED monthClose exists), quoting its number', async () => {
      const { service } = createService();
      const repository = createMockRepository({
        id: 'other-month-close',
        number: 'MC-000001',
      });

      await expect(
        service.validate(
          createContext({ monthClose: repository }),
          monthClose(),
          [],
        ),
      ).rejects.toThrow(/MC-000001/);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: {
          organizationId: ORGANIZATION_ID,
          period: '2026-08-01',
          docStatus: 'POSTED',
        },
        withDeleted: true,
      });
    });

    // Review Minor #3 (phase-9 final): a UI-created monthClose with no
    // postingDate must close dated to the PERIOD, not to whatever "now"
    // PostingService.resolvePostingDate stood in with before validate() ran.
    it('defaults context.postingDate to the last day of the period when the document has none', async () => {
      const { service } = createService();
      // Stand-in for PostingService's pre-validate "now" resolution — must
      // differ from the period's last day so the assertion is meaningful.
      const context = createContext({ monthClose: createMockRepository() });

      context.postingDate = '2026-09-05';

      await service.validate(context, monthClose({ period: '2026-08-01' }), []);

      expect(context.postingDate).toBe('2026-08-31');
    });

    it('does not override an explicit postingDate already on the document', async () => {
      const { service } = createService();
      const context = createContext({ monthClose: createMockRepository() });

      context.postingDate = '2026-08-05';

      await service.validate(
        context,
        monthClose({ period: '2026-08-01', postingDate: '2026-08-05' }),
        [],
      );

      expect(context.postingDate).toBe('2026-08-05');
    });
  });

  describe('getPartyEntries', () => {
    it('numbers the document with the MC- prefix, names it and returns no register rows', async () => {
      const repositories = { monthClose: createMockRepository() };
      const { service, documentNumberingService } = createService();
      const context = createContext(repositories);

      const entries = await service.getPartyEntries(context, monthClose(), []);

      expect(entries).toEqual([]);
      expect(documentNumberingService.nextDocumentNumber).toHaveBeenCalledWith({
        workspaceId: WORKSPACE_ID,
        docType: 'monthClose',
        prefix: 'MC',
        executeRawQuery: context.transactionScope.executeRawQuery,
      });
      expect(repositories.monthClose.update).toHaveBeenCalledWith(
        MONTH_CLOSE_ID,
        {
          number: 'MC-000003',
          name: 'Закрытие месяца № MC-000003 от 31.08.2026',
        },
      );
    });

    it('appends a reformation suffix to the name when isYearReformation is set', async () => {
      const repositories = { monthClose: createMockRepository() };
      const { service } = createService();

      await service.getPartyEntries(
        createContext(repositories),
        monthClose({ isYearReformation: true }),
        [],
      );

      expect(repositories.monthClose.update).toHaveBeenCalledWith(
        MONTH_CLOSE_ID,
        expect.objectContaining({
          name: expect.stringContaining('(реформация года)'),
        }),
      );
    });
  });
});
