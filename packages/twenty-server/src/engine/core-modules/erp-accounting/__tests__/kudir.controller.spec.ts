import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { KudirController } from 'src/engine/core-modules/erp-accounting/controllers/kudir.controller';
import { type KudirService } from 'src/engine/core-modules/erp-accounting/services/kudir.service';
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
  const kudirService = {
    renderHtml: jest.fn().mockResolvedValue('<html></html>'),
  } as unknown as KudirService;
  const erpObjectPermissionGuardService = {
    assertCanReadObjectRecords: jest.fn().mockResolvedValue(undefined),
  } as unknown as ErpObjectPermissionGuardService;
  const erpActorRoleResolverService = {
    resolveRoleId: jest.fn().mockResolvedValue('role-1'),
  } as unknown as ErpActorRoleResolverService;

  return {
    controller: new KudirController(
      kudirService,
      erpObjectPermissionGuardService,
      erpActorRoleResolverService,
    ),
    kudirService,
    erpObjectPermissionGuardService,
    erpActorRoleResolverService,
  };
};

describe('KudirController', () => {
  it('renders the КУДиР once the read permission check on payment passes', async () => {
    const {
      controller,
      kudirService,
      erpObjectPermissionGuardService,
      erpActorRoleResolverService,
    } = createController();
    const response = buildResponse();

    await controller.getKudir(
      WORKSPACE,
      'user-workspace-1',
      undefined,
      ORGANIZATION_ID,
      '2026',
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
      objectNameSingular: 'payment',
    });
    expect(kudirService.renderHtml).toHaveBeenCalledWith(
      WORKSPACE.id,
      ORGANIZATION_ID,
      2026,
    );
    expect(response.send).toHaveBeenCalledWith('<html></html>');
  });

  it('propagates the guard rejection and never renders the КУДиР', async () => {
    const { controller, kudirService, erpObjectPermissionGuardService } =
      createController();

    (
      erpObjectPermissionGuardService.assertCanReadObjectRecords as jest.Mock
    ).mockRejectedValue(new ForbiddenException('нет прав'));

    await expect(
      controller.getKudir(
        WORKSPACE,
        'user-workspace-1',
        undefined,
        ORGANIZATION_ID,
        '2026',
        buildResponse(),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(kudirService.renderHtml).not.toHaveBeenCalled();
  });

  it('propagates a "не на УСН" BadRequestException from the service unchanged', async () => {
    const { controller, kudirService } = createController();

    (kudirService.renderHtml as jest.Mock).mockRejectedValue(
      new BadRequestException('КУДиР ведётся только для организаций на УСН'),
    );

    await expect(
      controller.getKudir(
        WORKSPACE,
        'user-workspace-1',
        undefined,
        ORGANIZATION_ID,
        '2026',
        buildResponse(),
      ),
    ).rejects.toThrow('КУДиР ведётся только для организаций на УСН');
  });

  it('propagates a "не найдена" NotFoundException from the service unchanged', async () => {
    const { controller, kudirService } = createController();

    (kudirService.renderHtml as jest.Mock).mockRejectedValue(
      new NotFoundException('Организация не найдена'),
    );

    await expect(
      controller.getKudir(
        WORKSPACE,
        'user-workspace-1',
        undefined,
        ORGANIZATION_ID,
        '2026',
        buildResponse(),
      ),
    ).rejects.toThrow('Организация не найдена');
  });

  describe('param validation (400 RU, service never called)', () => {
    it.each([
      ['missing organizationId', undefined, '2026'],
      ['garbage organizationId', 'not-a-uuid', '2026'],
      ['missing year', ORGANIZATION_ID, undefined],
      ['garbage year', ORGANIZATION_ID, 'twenty-twenty-six'],
      ['non-4-digit year', ORGANIZATION_ID, '26'],
      ['year below range', ORGANIZATION_ID, '1999'],
      ['year above range', ORGANIZATION_ID, '2101'],
    ])('rejects: %s', async (_label, organizationId, year) => {
      const { controller, kudirService, erpActorRoleResolverService } =
        createController();

      await expect(
        controller.getKudir(
          WORKSPACE,
          'user-workspace-1',
          undefined,
          organizationId,
          year,
          buildResponse(),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(erpActorRoleResolverService.resolveRoleId).not.toHaveBeenCalled();
      expect(kudirService.renderHtml).not.toHaveBeenCalled();
    });
  });
});
