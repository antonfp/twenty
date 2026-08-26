import { ForbiddenException } from '@nestjs/common';

import { type ErpActorRoleResolverService } from 'src/engine/core-modules/erp/services/erp-actor-role-resolver.service';
import { type ErpObjectPermissionGuardService } from 'src/engine/core-modules/erp/services/erp-object-permission-guard.service';
import { SalesInvoicePrintController } from 'src/engine/core-modules/erp-sales/controllers/sales-invoice-print.controller';
import { type SalesInvoicePrintService } from 'src/engine/core-modules/erp-sales/services/sales-invoice-print.service';
import { type WorkspaceEntity } from 'src/engine/core-modules/workspace/workspace.entity';

const WORKSPACE = { id: 'workspace-1' } as WorkspaceEntity;
const INVOICE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

const buildResponse = () =>
  ({
    setHeader: jest.fn(),
    send: jest.fn(),
  }) as unknown as import('express').Response;

const createController = () => {
  const salesInvoicePrintService = {
    renderSalesInvoiceHtml: jest.fn().mockResolvedValue('<html></html>'),
  } as unknown as SalesInvoicePrintService;
  const erpObjectPermissionGuardService = {
    assertCanReadObjectRecords: jest.fn().mockResolvedValue(undefined),
  } as unknown as ErpObjectPermissionGuardService;
  const erpActorRoleResolverService = {
    resolveRoleId: jest.fn().mockResolvedValue('role-1'),
  } as unknown as ErpActorRoleResolverService;

  return {
    controller: new SalesInvoicePrintController(
      salesInvoicePrintService,
      erpObjectPermissionGuardService,
      erpActorRoleResolverService,
    ),
    salesInvoicePrintService,
    erpObjectPermissionGuardService,
    erpActorRoleResolverService,
  };
};

describe('SalesInvoicePrintController', () => {
  it('renders the invoice once the read permission check passes', async () => {
    const {
      controller,
      salesInvoicePrintService,
      erpObjectPermissionGuardService,
      erpActorRoleResolverService,
    } = createController();
    const response = buildResponse();

    await controller.printSalesInvoice(
      WORKSPACE,
      'user-workspace-1',
      undefined,
      INVOICE_ID,
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
      objectNameSingular: 'salesInvoice',
    });
    expect(
      salesInvoicePrintService.renderSalesInvoiceHtml,
    ).toHaveBeenCalledWith(WORKSPACE.id, INVOICE_ID);
    expect(response.send).toHaveBeenCalledWith('<html></html>');
  });

  it('propagates the guard rejection and never renders the invoice', async () => {
    const {
      controller,
      salesInvoicePrintService,
      erpObjectPermissionGuardService,
    } = createController();

    (
      erpObjectPermissionGuardService.assertCanReadObjectRecords as jest.Mock
    ).mockRejectedValue(new ForbiddenException('нет прав'));

    await expect(
      controller.printSalesInvoice(
        WORKSPACE,
        'user-workspace-1',
        undefined,
        INVOICE_ID,
        buildResponse(),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(
      salesInvoicePrintService.renderSalesInvoiceHtml,
    ).not.toHaveBeenCalled();
  });
});
