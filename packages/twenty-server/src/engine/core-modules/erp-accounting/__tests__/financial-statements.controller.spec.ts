import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { FinancialStatementsController } from 'src/engine/core-modules/erp-accounting/controllers/financial-statements.controller';
import { type BalanceSheetService } from 'src/engine/core-modules/erp-accounting/services/balance-sheet.service';
import { type IncomeStatementService } from 'src/engine/core-modules/erp-accounting/services/income-statement.service';
import { type ErpActorRoleResolverService } from 'src/engine/core-modules/erp/services/erp-actor-role-resolver.service';
import { type ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

const WORKSPACE = { id: 'workspace-1' } as WorkspaceEntity;
const ORGANIZATION_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

const buildResponse = () =>
  ({
    setHeader: jest.fn(),
    send: jest.fn(),
  }) as unknown as import('express').Response;

const createController = () => {
  const balanceSheetService = {
    renderHtml: jest.fn().mockResolvedValue('<html>баланс</html>'),
  } as unknown as BalanceSheetService;
  const incomeStatementService = {
    renderHtml: jest.fn().mockResolvedValue('<html>офр</html>'),
  } as unknown as IncomeStatementService;
  const erpObjectPermissionGuardService = {
    assertCanReadObjectRecords: jest.fn().mockResolvedValue(undefined),
  } as unknown as ErpObjectPermissionGuardService;
  const erpActorRoleResolverService = {
    resolveRoleId: jest.fn().mockResolvedValue('role-1'),
  } as unknown as ErpActorRoleResolverService;

  return {
    controller: new FinancialStatementsController(
      balanceSheetService,
      incomeStatementService,
      erpObjectPermissionGuardService,
      erpActorRoleResolverService,
    ),
    balanceSheetService,
    incomeStatementService,
    erpObjectPermissionGuardService,
    erpActorRoleResolverService,
  };
};

describe('FinancialStatementsController', () => {
  describe('GET balance-sheet', () => {
    it('renders the баланс once the read permission check on glEntry passes', async () => {
      const {
        controller,
        balanceSheetService,
        erpObjectPermissionGuardService,
        erpActorRoleResolverService,
      } = createController();
      const response = buildResponse();

      await controller.getBalanceSheet(
        WORKSPACE,
        'user-workspace-1',
        undefined,
        ORGANIZATION_ID,
        '2026-08-31',
        response,
      );

      expect(erpActorRoleResolverService.resolveRoleId).toHaveBeenCalledWith({
        workspaceId: WORKSPACE.id,
        userWorkspaceId: 'user-workspace-1',
        apiKey: undefined,
      });
      expect(
        erpObjectPermissionGuardService.assertCanReadObjectRecords,
      ).toHaveBeenCalledWith({
        workspaceId: WORKSPACE.id,
        roleId: 'role-1',
        objectNameSingular: 'glEntry',
      });
      expect(balanceSheetService.renderHtml).toHaveBeenCalledWith(
        WORKSPACE.id,
        ORGANIZATION_ID,
        '2026-08-31',
      );
      expect(response.send).toHaveBeenCalledWith('<html>баланс</html>');
    });

    it('propagates the guard rejection and never renders the баланс', async () => {
      const {
        controller,
        balanceSheetService,
        erpObjectPermissionGuardService,
      } = createController();

      (
        erpObjectPermissionGuardService.assertCanReadObjectRecords as jest.Mock
      ).mockRejectedValue(new ForbiddenException('нет прав'));

      await expect(
        controller.getBalanceSheet(
          WORKSPACE,
          'user-workspace-1',
          undefined,
          ORGANIZATION_ID,
          '2026-08-31',
          buildResponse(),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(balanceSheetService.renderHtml).not.toHaveBeenCalled();
    });

    describe('param validation (400 RU, service never called)', () => {
      it.each([
        ['missing organizationId', undefined, '2026-08-31'],
        ['garbage organizationId', 'not-a-uuid', '2026-08-31'],
        ['missing date', ORGANIZATION_ID, undefined],
        ['garbage date', ORGANIZATION_ID, '31.08.2026'],
        ['impossible calendar date', ORGANIZATION_ID, '2026-02-30'],
      ])('rejects: %s', async (_label, organizationId, date) => {
        const { controller, balanceSheetService, erpActorRoleResolverService } =
          createController();

        await expect(
          controller.getBalanceSheet(
            WORKSPACE,
            'user-workspace-1',
            undefined,
            organizationId,
            date,
            buildResponse(),
          ),
        ).rejects.toThrow(BadRequestException);
        expect(
          erpActorRoleResolverService.resolveRoleId,
        ).not.toHaveBeenCalled();
        expect(balanceSheetService.renderHtml).not.toHaveBeenCalled();
      });

      it('accepts a leap-day date (2028-02-29)', async () => {
        const { controller, balanceSheetService } = createController();

        await controller.getBalanceSheet(
          WORKSPACE,
          'user-workspace-1',
          undefined,
          ORGANIZATION_ID,
          '2028-02-29',
          buildResponse(),
        );

        expect(balanceSheetService.renderHtml).toHaveBeenCalledWith(
          WORKSPACE.id,
          ORGANIZATION_ID,
          '2028-02-29',
        );
      });
    });
  });

  describe('GET income-statement', () => {
    it('renders the ОФР once the read permission check on glEntry passes', async () => {
      const {
        controller,
        incomeStatementService,
        erpObjectPermissionGuardService,
        erpActorRoleResolverService,
      } = createController();
      const response = buildResponse();

      await controller.getIncomeStatement(
        WORKSPACE,
        'user-workspace-1',
        undefined,
        ORGANIZATION_ID,
        '2026-08-01',
        '2026-08-31',
        response,
      );

      expect(erpActorRoleResolverService.resolveRoleId).toHaveBeenCalledWith({
        workspaceId: WORKSPACE.id,
        userWorkspaceId: 'user-workspace-1',
        apiKey: undefined,
      });
      expect(
        erpObjectPermissionGuardService.assertCanReadObjectRecords,
      ).toHaveBeenCalledWith({
        workspaceId: WORKSPACE.id,
        roleId: 'role-1',
        objectNameSingular: 'glEntry',
      });
      expect(incomeStatementService.renderHtml).toHaveBeenCalledWith(
        WORKSPACE.id,
        ORGANIZATION_ID,
        '2026-08-01',
        '2026-08-31',
      );
      expect(response.send).toHaveBeenCalledWith('<html>офр</html>');
    });

    it('propagates the guard rejection and never renders the ОФР', async () => {
      const {
        controller,
        incomeStatementService,
        erpObjectPermissionGuardService,
      } = createController();

      (
        erpObjectPermissionGuardService.assertCanReadObjectRecords as jest.Mock
      ).mockRejectedValue(new ForbiddenException('нет прав'));

      await expect(
        controller.getIncomeStatement(
          WORKSPACE,
          'user-workspace-1',
          undefined,
          ORGANIZATION_ID,
          '2026-08-01',
          '2026-08-31',
          buildResponse(),
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(incomeStatementService.renderHtml).not.toHaveBeenCalled();
    });

    describe('param validation (400 RU, service never called)', () => {
      it.each([
        ['missing organizationId', undefined, '2026-08-01', '2026-08-31'],
        ['garbage organizationId', 'not-a-uuid', '2026-08-01', '2026-08-31'],
        ['missing dateFrom', ORGANIZATION_ID, undefined, '2026-08-31'],
        ['garbage dateFrom', ORGANIZATION_ID, '01.08.2026', '2026-08-31'],
        [
          'impossible calendar date',
          ORGANIZATION_ID,
          '2026-02-30',
          '2026-08-31',
        ],
        ['missing dateTo', ORGANIZATION_ID, '2026-08-01', undefined],
        ['dateFrom after dateTo', ORGANIZATION_ID, '2026-08-31', '2026-08-01'],
      ])('rejects: %s', async (_label, organizationId, dateFrom, dateTo) => {
        const {
          controller,
          incomeStatementService,
          erpActorRoleResolverService,
        } = createController();

        await expect(
          controller.getIncomeStatement(
            WORKSPACE,
            'user-workspace-1',
            undefined,
            organizationId,
            dateFrom,
            dateTo,
            buildResponse(),
          ),
        ).rejects.toThrow(BadRequestException);
        expect(
          erpActorRoleResolverService.resolveRoleId,
        ).not.toHaveBeenCalled();
        expect(incomeStatementService.renderHtml).not.toHaveBeenCalled();
      });
    });
  });
});
