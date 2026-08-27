import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { AccountCardController } from 'src/engine/core-modules/erp-accounting/controllers/account-card.controller';
import { type AccountCardService } from 'src/engine/core-modules/erp-accounting/services/account-card.service';
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
  const accountCardService = {
    renderHtml: jest.fn().mockResolvedValue('<html></html>'),
  } as unknown as AccountCardService;
  const erpObjectPermissionGuardService = {
    assertCanReadObjectRecords: jest.fn().mockResolvedValue(undefined),
  } as unknown as ErpObjectPermissionGuardService;
  const erpActorRoleResolverService = {
    resolveRoleId: jest.fn().mockResolvedValue('role-1'),
  } as unknown as ErpActorRoleResolverService;

  return {
    controller: new AccountCardController(
      accountCardService,
      erpObjectPermissionGuardService,
      erpActorRoleResolverService,
    ),
    accountCardService,
    erpObjectPermissionGuardService,
    erpActorRoleResolverService,
  };
};

describe('AccountCardController', () => {
  it('renders the карточка счёта once the read permission check on glEntry passes', async () => {
    const {
      controller,
      accountCardService,
      erpObjectPermissionGuardService,
      erpActorRoleResolverService,
    } = createController();
    const response = buildResponse();

    await controller.getAccountCard(
      WORKSPACE,
      'user-workspace-1',
      undefined,
      ORGANIZATION_ID,
      '51',
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
    expect(accountCardService.renderHtml).toHaveBeenCalledWith(
      WORKSPACE.id,
      ORGANIZATION_ID,
      '51',
      '2026-08-01',
      '2026-08-31',
    );
    expect(response.send).toHaveBeenCalledWith('<html></html>');
  });

  it('propagates the guard rejection and never renders the карточка', async () => {
    const { controller, accountCardService, erpObjectPermissionGuardService } =
      createController();

    (
      erpObjectPermissionGuardService.assertCanReadObjectRecords as jest.Mock
    ).mockRejectedValue(new ForbiddenException('нет прав'));

    await expect(
      controller.getAccountCard(
        WORKSPACE,
        'user-workspace-1',
        undefined,
        ORGANIZATION_ID,
        '51',
        '2026-08-01',
        '2026-08-31',
        buildResponse(),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(accountCardService.renderHtml).not.toHaveBeenCalled();
  });

  it('propagates a "Счёт не найден" NotFoundException from the service unchanged', async () => {
    const { controller, accountCardService } = createController();

    (accountCardService.renderHtml as jest.Mock).mockRejectedValue(
      new NotFoundException('Счёт не найден в плане счетов'),
    );

    await expect(
      controller.getAccountCard(
        WORKSPACE,
        'user-workspace-1',
        undefined,
        ORGANIZATION_ID,
        '99.99',
        '2026-08-01',
        '2026-08-31',
        buildResponse(),
      ),
    ).rejects.toThrow('Счёт не найден в плане счетов');
  });

  describe('param validation (400 RU, service never called)', () => {
    it.each([
      ['missing organizationId', undefined, '51', '2026-08-01', '2026-08-31'],
      [
        'garbage organizationId',
        'not-a-uuid',
        '51',
        '2026-08-01',
        '2026-08-31',
      ],
      [
        'missing accountCode',
        ORGANIZATION_ID,
        undefined,
        '2026-08-01',
        '2026-08-31',
      ],
      ['empty accountCode', ORGANIZATION_ID, '', '2026-08-01', '2026-08-31'],
      ['missing dateFrom', ORGANIZATION_ID, '51', undefined, '2026-08-31'],
      ['garbage dateFrom', ORGANIZATION_ID, '51', '01.08.2026', '2026-08-31'],
      [
        'impossible calendar date',
        ORGANIZATION_ID,
        '51',
        '2026-02-30',
        '2026-08-31',
      ],
      ['missing dateTo', ORGANIZATION_ID, '51', '2026-08-01', undefined],
      [
        'dateFrom after dateTo',
        ORGANIZATION_ID,
        '51',
        '2026-08-31',
        '2026-08-01',
      ],
    ])(
      'rejects: %s',
      async (_label, organizationId, accountCode, dateFrom, dateTo) => {
        const { controller, accountCardService, erpActorRoleResolverService } =
          createController();

        await expect(
          controller.getAccountCard(
            WORKSPACE,
            'user-workspace-1',
            undefined,
            organizationId,
            accountCode,
            dateFrom,
            dateTo,
            buildResponse(),
          ),
        ).rejects.toThrow(BadRequestException);
        expect(
          erpActorRoleResolverService.resolveRoleId,
        ).not.toHaveBeenCalled();
        expect(accountCardService.renderHtml).not.toHaveBeenCalled();
      },
    );
  });
});
