import { BadRequestException, ForbiddenException } from '@nestjs/common';

import { TrialBalanceController } from 'src/engine/core-modules/erp-accounting/controllers/trial-balance.controller';
import { type TrialBalanceService } from 'src/engine/core-modules/erp-accounting/services/trial-balance.service';
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
  const trialBalanceService = {
    renderHtml: jest.fn().mockResolvedValue('<html></html>'),
  } as unknown as TrialBalanceService;
  const erpObjectPermissionGuardService = {
    assertCanReadObjectRecords: jest.fn().mockResolvedValue(undefined),
  } as unknown as ErpObjectPermissionGuardService;
  const erpActorRoleResolverService = {
    resolveRoleId: jest.fn().mockResolvedValue('role-1'),
  } as unknown as ErpActorRoleResolverService;

  return {
    controller: new TrialBalanceController(
      trialBalanceService,
      erpObjectPermissionGuardService,
      erpActorRoleResolverService,
    ),
    trialBalanceService,
    erpObjectPermissionGuardService,
    erpActorRoleResolverService,
  };
};

describe('TrialBalanceController', () => {
  it('renders the ОСВ once the read permission check on glEntry passes', async () => {
    const {
      controller,
      trialBalanceService,
      erpObjectPermissionGuardService,
      erpActorRoleResolverService,
    } = createController();
    const response = buildResponse();

    await controller.getTrialBalance(
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
    expect(trialBalanceService.renderHtml).toHaveBeenCalledWith(
      WORKSPACE.id,
      ORGANIZATION_ID,
      '2026-08-01',
      '2026-08-31',
    );
    expect(response.send).toHaveBeenCalledWith('<html></html>');
  });

  it('propagates the guard rejection and never renders the ОСВ', async () => {
    const {
      controller,
      trialBalanceService,
      erpObjectPermissionGuardService,
    } = createController();

    (
      erpObjectPermissionGuardService.assertCanReadObjectRecords as jest.Mock
    ).mockRejectedValue(new ForbiddenException('нет прав'));

    await expect(
      controller.getTrialBalance(
        WORKSPACE,
        'user-workspace-1',
        undefined,
        ORGANIZATION_ID,
        '2026-08-01',
        '2026-08-31',
        buildResponse(),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(trialBalanceService.renderHtml).not.toHaveBeenCalled();
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
      [
        'dateFrom after dateTo',
        ORGANIZATION_ID,
        '2026-08-31',
        '2026-08-01',
      ],
    ])('rejects: %s', async (_label, organizationId, dateFrom, dateTo) => {
      const { controller, trialBalanceService, erpActorRoleResolverService } =
        createController();

      await expect(
        controller.getTrialBalance(
          WORKSPACE,
          'user-workspace-1',
          undefined,
          organizationId,
          dateFrom,
          dateTo,
          buildResponse(),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(erpActorRoleResolverService.resolveRoleId).not.toHaveBeenCalled();
      expect(trialBalanceService.renderHtml).not.toHaveBeenCalled();
    });

    it('accepts a leap-day date (2028-02-29)', async () => {
      const { controller, trialBalanceService } = createController();

      await controller.getTrialBalance(
        WORKSPACE,
        'user-workspace-1',
        undefined,
        ORGANIZATION_ID,
        '2028-02-01',
        '2028-02-29',
        buildResponse(),
      );

      expect(trialBalanceService.renderHtml).toHaveBeenCalledWith(
        WORKSPACE.id,
        ORGANIZATION_ID,
        '2028-02-01',
        '2028-02-29',
      );
    });
  });
});
