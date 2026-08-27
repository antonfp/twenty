import { ForbiddenException } from '@nestjs/common';

import { createReconcilePaymentsTool } from 'src/engine/api/mcp/tools/reconcile-payments.tool';
import { type ReconciliationService } from 'src/engine/core-modules/erp-accounting/services/reconciliation.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const ORGANIZATION_ID = '30303030-0d5c-4a83-91d7-63f5b1a2f001';

const buildReconciliationService = () =>
  ({
    getReconciliationProposals: jest.fn().mockResolvedValue([
      {
        paymentType: 'payment',
        paymentId: 'payment-1',
        paymentNumber: null,
        paymentAmountKopecks: 150_000,
        paymentComment: 'Оплата по счёту № SI-000001',
        counterpartyId: 'company-1',
        counterpartyName: 'ООО Ромашка',
        counterpartyInn: '7712345678',
        candidates: [
          {
            invoiceId: 'invoice-1',
            invoiceNumber: 'SI-000001',
            invoiceTotalKopecks: 150_000,
            remainingKopecks: 150_000,
            score: 3,
            explanation: 'ИНН контрагента совпадает; сумма точно совпадает.',
          },
        ],
      },
    ]),
  }) as unknown as ReconciliationService;

describe('createReconcilePaymentsTool', () => {
  it('refuses when the calling role lacks canReadObjectRecords on any of the four objects', async () => {
    const reconciliationService = buildReconciliationService();
    const assertCanReadObjectRecords = jest
      .fn()
      .mockRejectedValue(
        new ForbiddenException('Недостаточно прав: роль без права.'),
      );

    const tool = createReconcilePaymentsTool(
      reconciliationService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    await expect(
      tool.execute({ organizationId: ORGANIZATION_ID }),
    ).rejects.toThrow(ForbiddenException);

    expect(assertCanReadObjectRecords).toHaveBeenCalledWith('payment');
    expect(
      reconciliationService.getReconciliationProposals,
    ).not.toHaveBeenCalled();
  });

  it('checks read permission on payment, supplierPayment, salesInvoice and supplierInvoice', async () => {
    const reconciliationService = buildReconciliationService();
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createReconcilePaymentsTool(
      reconciliationService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    await tool.execute({ organizationId: ORGANIZATION_ID });

    expect(
      assertCanReadObjectRecords.mock.calls.map((call) => call[0]),
    ).toEqual([
      'payment',
      'supplierPayment',
      'salesInvoice',
      'supplierInvoice',
    ]);
  });

  it('delegates to the service and returns the proposals verbatim', async () => {
    const reconciliationService = buildReconciliationService();
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createReconcilePaymentsTool(
      reconciliationService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    const result = await tool.execute({ organizationId: ORGANIZATION_ID });

    expect(
      reconciliationService.getReconciliationProposals,
    ).toHaveBeenCalledWith(WORKSPACE_ID, ORGANIZATION_ID);
    expect(result).toHaveLength(1);
    expect(result[0].candidates[0]).toEqual(
      expect.objectContaining({ invoiceId: 'invoice-1', score: 3 }),
    );
  });
});
