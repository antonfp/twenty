import { ForbiddenException } from '@nestjs/common';

import { createConfirmReconciliationTool } from 'src/engine/api/mcp/tools/confirm-reconciliation.tool';
import { type ReconciliationService } from 'src/engine/core-modules/erp-accounting/services/reconciliation.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const PAYMENT_ID = '30303030-0d5c-4a83-91d7-63f5b1a2f001';
const INVOICE_ID = '40404040-0d5c-4a83-91d7-63f5b1a2f001';

const buildReconciliationService = () =>
  ({
    confirmReconciliation: jest.fn().mockResolvedValue({
      success: true,
      alreadyLinked: false,
      message: 'Платёж привязан к счёту № SI-000001.',
    }),
  }) as unknown as ReconciliationService;

describe('createConfirmReconciliationTool', () => {
  it('refuses when the calling role lacks canUpdateObjectRecords', async () => {
    const reconciliationService = buildReconciliationService();
    const assertCanUpdateObjectRecords = jest
      .fn()
      .mockRejectedValue(
        new ForbiddenException('Недостаточно прав: роль без права.'),
      );

    const tool = createConfirmReconciliationTool(
      reconciliationService,
      WORKSPACE_ID,
      assertCanUpdateObjectRecords,
    );

    await expect(
      tool.execute({ paymentId: PAYMENT_ID, invoiceId: INVOICE_ID }),
    ).rejects.toThrow(ForbiddenException);

    expect(assertCanUpdateObjectRecords).toHaveBeenCalledWith('payment');
    expect(reconciliationService.confirmReconciliation).not.toHaveBeenCalled();
  });

  it('checks update permission on both payment and supplierPayment upfront', async () => {
    const reconciliationService = buildReconciliationService();
    const assertCanUpdateObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createConfirmReconciliationTool(
      reconciliationService,
      WORKSPACE_ID,
      assertCanUpdateObjectRecords,
    );

    await tool.execute({ paymentId: PAYMENT_ID, invoiceId: INVOICE_ID });

    expect(
      assertCanUpdateObjectRecords.mock.calls.map((call) => call[0]),
    ).toEqual(['payment', 'supplierPayment']);
  });

  it('delegates to the service and returns its result verbatim', async () => {
    const reconciliationService = buildReconciliationService();
    const assertCanUpdateObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createConfirmReconciliationTool(
      reconciliationService,
      WORKSPACE_ID,
      assertCanUpdateObjectRecords,
    );

    const result = await tool.execute({
      paymentId: PAYMENT_ID,
      invoiceId: INVOICE_ID,
    });

    expect(reconciliationService.confirmReconciliation).toHaveBeenCalledWith(
      WORKSPACE_ID,
      PAYMENT_ID,
      INVOICE_ID,
    );
    expect(result).toEqual({
      success: true,
      alreadyLinked: false,
      message: 'Платёж привязан к счёту № SI-000001.',
    });
  });
});
