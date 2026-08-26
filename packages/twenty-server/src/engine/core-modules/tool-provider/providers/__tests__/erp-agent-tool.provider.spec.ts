import { ForbiddenException } from '@nestjs/common';

import { FieldActorSource } from 'twenty-shared/types';

import { type PostingService } from 'src/engine/core-modules/erp/services/posting.service';
import { type ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { type TrialBalanceService } from 'src/engine/core-modules/erp-accounting/services/trial-balance.service';
import { ErpAgentToolProvider } from 'src/engine/core-modules/tool-provider/providers/erp-agent-tool.provider';
import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ROLE_ID = 'role-id';
const RECORD_ID = '30303030-0d5c-4a83-91d7-63f5b1a2f001';
const ORGANIZATION_ID = '40404040-0d5c-4a83-91d7-63f5b1a2f001';

const context: ToolProviderContext = {
  workspaceId: WORKSPACE_ID,
  roleId: ROLE_ID,
  rolePermissionConfig: { unionOf: [ROLE_ID] },
  actorContext: {
    source: FieldActorSource.AGENT,
    workspaceMemberId: null,
    name: 'ERPilot-ассистент',
    context: {},
  },
};

const buildProvider = (options?: { permissionDenied?: boolean }) => {
  const postingService = {
    post: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
  } as unknown as PostingService;

  const trialBalanceService = {
    getTrialBalanceData: jest.fn().mockResolvedValue({
      rows: [
        {
          code: '62',
          name: 'Расчёты с покупателями',
          openingDebitKopecks: 0,
          openingCreditKopecks: 0,
          turnoverDebitKopecks: 1500000,
          turnoverCreditKopecks: 0,
          closingDebitKopecks: 1500000,
          closingCreditKopecks: 0,
        },
      ],
      totals: {
        openingDebitKopecks: 0,
        openingCreditKopecks: 0,
        turnoverDebitKopecks: 1500000,
        turnoverCreditKopecks: 0,
        closingDebitKopecks: 1500000,
        closingCreditKopecks: 0,
      },
    }),
  } as unknown as TrialBalanceService;

  const denied = options?.permissionDenied ?? false;
  const erpObjectPermissionGuardService = {
    assertCanUpdateObjectRecords: jest
      .fn()
      .mockImplementation(() =>
        denied
          ? Promise.reject(new ForbiddenException('Недостаточно прав.'))
          : Promise.resolve(undefined),
      ),
    assertCanReadObjectRecords: jest
      .fn()
      .mockImplementation(() =>
        denied
          ? Promise.reject(new ForbiddenException('Недостаточно прав.'))
          : Promise.resolve(undefined),
      ),
  } as unknown as ErpObjectPermissionGuardService;

  const provider = new ErpAgentToolProvider(
    postingService,
    trialBalanceService,
    erpObjectPermissionGuardService,
  );

  return {
    provider,
    postingService,
    trialBalanceService,
    erpObjectPermissionGuardService,
  };
};

describe('ErpAgentToolProvider', () => {
  describe('generateDescriptors', () => {
    it('exposes post_document, cancel_document and trial_balance', async () => {
      const { provider } = buildProvider();

      const descriptors = await provider.generateDescriptors(context, {
        includeSchemas: false,
      });

      expect(descriptors.map((descriptor) => descriptor.name)).toEqual(
        expect.arrayContaining([
          'post_document',
          'cancel_document',
          'trial_balance',
        ]),
      );

      for (const descriptor of descriptors) {
        expect(descriptor.description.length).toBeGreaterThan(0);
      }
    });
  });

  describe('post_document', () => {
    it('posts the document once the permission check passes', async () => {
      const { provider, postingService } = buildProvider();

      const output = await provider.executeStaticTool(
        'post_document',
        { objectNameSingular: 'salesInvoice', recordId: RECORD_ID },
        context,
      );

      expect(output.success).toBe(true);
      expect(postingService.post).toHaveBeenCalledWith(
        WORKSPACE_ID,
        'salesInvoice',
        RECORD_ID,
      );
    });

    it('rejects when the role lacks canUpdateObjectRecords', async () => {
      const { provider, postingService } = buildProvider({
        permissionDenied: true,
      });

      await expect(
        provider.executeStaticTool(
          'post_document',
          { objectNameSingular: 'salesInvoice', recordId: RECORD_ID },
          context,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(postingService.post).not.toHaveBeenCalled();
    });
  });

  describe('cancel_document', () => {
    it('cancels the document once the permission check passes', async () => {
      const { provider, postingService } = buildProvider();

      const output = await provider.executeStaticTool(
        'cancel_document',
        { objectNameSingular: 'salesInvoice', recordId: RECORD_ID },
        context,
      );

      expect(output.success).toBe(true);
      expect(postingService.cancel).toHaveBeenCalledWith(
        WORKSPACE_ID,
        'salesInvoice',
        RECORD_ID,
      );
    });
  });

  describe('trial_balance', () => {
    it('wraps the ОСВ rows/totals into a ToolOutput result', async () => {
      const { provider, trialBalanceService } = buildProvider();

      const output = await provider.executeStaticTool(
        'trial_balance',
        {
          organizationId: ORGANIZATION_ID,
          dateFrom: '2026-08-01',
          dateTo: '2026-08-31',
        },
        context,
      );

      expect(output.success).toBe(true);
      expect(output.result).toEqual(
        expect.objectContaining({
          rows: expect.arrayContaining([
            expect.objectContaining({
              accountCode: '62',
              turnoverDebit: 1500000,
            }),
          ]),
          totals: expect.objectContaining({ turnoverDebit: 1500000 }),
        }),
      );
      expect(trialBalanceService.getTrialBalanceData).toHaveBeenCalledWith(
        WORKSPACE_ID,
        ORGANIZATION_ID,
        '2026-08-01',
        '2026-08-31',
      );
    });

    it('rejects when the role lacks canReadObjectRecords on glEntry', async () => {
      const { provider } = buildProvider({ permissionDenied: true });

      await expect(
        provider.executeStaticTool(
          'trial_balance',
          {
            organizationId: ORGANIZATION_ID,
            dateFrom: '2026-08-01',
            dateTo: '2026-08-31',
          },
          context,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
