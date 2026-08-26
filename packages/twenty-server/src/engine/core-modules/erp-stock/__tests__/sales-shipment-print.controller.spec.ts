import { ForbiddenException } from '@nestjs/common';

import { type ErpActorRoleResolverService } from 'src/engine/core-modules/erp/services/erp-actor-role-resolver.service';
import { type ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { SalesShipmentPrintController } from 'src/engine/core-modules/erp-stock/controllers/sales-shipment-print.controller';
import { type SalesShipmentPrintService } from 'src/engine/core-modules/erp-stock/services/sales-shipment-print.service';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

const WORKSPACE = { id: 'workspace-1' } as WorkspaceEntity;
const SHIPMENT_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

const buildResponse = () =>
  ({
    setHeader: jest.fn(),
    send: jest.fn(),
  }) as unknown as import('express').Response;

const createController = () => {
  const salesShipmentPrintService = {
    renderSalesShipmentUpdHtml: jest.fn().mockResolvedValue('<html></html>'),
  } as unknown as SalesShipmentPrintService;
  const erpObjectPermissionGuardService = {
    assertCanReadObjectRecords: jest.fn().mockResolvedValue(undefined),
  } as unknown as ErpObjectPermissionGuardService;
  const erpActorRoleResolverService = {
    resolveRoleId: jest.fn().mockResolvedValue('role-1'),
  } as unknown as ErpActorRoleResolverService;

  return {
    controller: new SalesShipmentPrintController(
      salesShipmentPrintService,
      erpObjectPermissionGuardService,
      erpActorRoleResolverService,
    ),
    salesShipmentPrintService,
    erpObjectPermissionGuardService,
    erpActorRoleResolverService,
  };
};

describe('SalesShipmentPrintController', () => {
  it('renders the УПД once the read permission check passes', async () => {
    const {
      controller,
      salesShipmentPrintService,
      erpObjectPermissionGuardService,
      erpActorRoleResolverService,
    } = createController();
    const response = buildResponse();

    await controller.printSalesShipmentUpd(
      WORKSPACE,
      'user-workspace-1',
      undefined,
      SHIPMENT_ID,
      undefined,
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
      objectNameSingular: 'salesShipment',
    });
    expect(
      salesShipmentPrintService.renderSalesShipmentUpdHtml,
    ).toHaveBeenCalledWith(WORKSPACE.id, SHIPMENT_ID, '2');
    expect(response.send).toHaveBeenCalledWith('<html></html>');
  });

  it('propagates the guard rejection and never renders the УПД', async () => {
    const {
      controller,
      salesShipmentPrintService,
      erpObjectPermissionGuardService,
    } = createController();

    (
      erpObjectPermissionGuardService.assertCanReadObjectRecords as jest.Mock
    ).mockRejectedValue(new ForbiddenException('нет прав'));

    await expect(
      controller.printSalesShipmentUpd(
        WORKSPACE,
        'user-workspace-1',
        undefined,
        SHIPMENT_ID,
        undefined,
        buildResponse(),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(
      salesShipmentPrintService.renderSalesShipmentUpdHtml,
    ).not.toHaveBeenCalled();
  });
});
