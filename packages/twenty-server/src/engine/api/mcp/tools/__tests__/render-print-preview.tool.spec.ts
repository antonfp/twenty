import { ForbiddenException } from '@nestjs/common';

import { createRenderPrintPreviewTool } from 'src/engine/api/mcp/tools/render-print-preview.tool';
import { type PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';
import { type SalesInvoicePrintService } from 'src/engine/core-modules/erp-sales/services/sales-invoice-print.service';
import { type SalesShipmentPrintService } from 'src/engine/core-modules/erp-stock/services/sales-shipment-print.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const RECORD_ID = '30303030-0d5c-4a83-91d7-63f5b1a2f001';

const buildServices = (resolved: {
  html: string;
  source: 'custom' | 'built-in';
  fallbackReason: string | null;
}) => {
  const printTemplateService = {
    findActiveTemplate: jest.fn().mockResolvedValue(null),
    resolveTemplateHtml: jest.fn().mockReturnValue(resolved),
  } as unknown as PrintTemplateService;
  const salesInvoicePrintService = {
    renderSalesInvoiceHtml: jest.fn().mockResolvedValue('<html>schet</html>'),
  } as unknown as SalesInvoicePrintService;
  const salesShipmentPrintService = {
    renderSalesShipmentUpdHtml: jest.fn().mockResolvedValue('<html>upd</html>'),
  } as unknown as SalesShipmentPrintService;

  return {
    printTemplateService,
    salesInvoicePrintService,
    salesShipmentPrintService,
  };
};

describe('createRenderPrintPreviewTool', () => {
  it('refuses when the calling role lacks read permission on printTemplate', async () => {
    const {
      printTemplateService,
      salesInvoicePrintService,
      salesShipmentPrintService,
    } = buildServices({
      html: '<div></div>',
      source: 'built-in',
      fallbackReason: null,
    });
    const assertCanReadObjectRecords = jest
      .fn()
      .mockRejectedValue(new ForbiddenException('нет прав'));

    const tool = createRenderPrintPreviewTool(
      printTemplateService,
      salesInvoicePrintService,
      salesShipmentPrintService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    await expect(
      tool.execute({ documentType: 'SCHET', recordId: RECORD_ID }),
    ).rejects.toThrow(ForbiddenException);
    expect(
      salesInvoicePrintService.renderSalesInvoiceHtml,
    ).not.toHaveBeenCalled();
  });

  it('renders the SCHET print service for documentType SCHET', async () => {
    const {
      printTemplateService,
      salesInvoicePrintService,
      salesShipmentPrintService,
    } = buildServices({
      html: '<div></div>',
      source: 'built-in',
      fallbackReason: null,
    });
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createRenderPrintPreviewTool(
      printTemplateService,
      salesInvoicePrintService,
      salesShipmentPrintService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    const result = await tool.execute({
      documentType: 'SCHET',
      recordId: RECORD_ID,
    });

    expect(assertCanReadObjectRecords).toHaveBeenCalledWith('printTemplate');
    expect(assertCanReadObjectRecords).toHaveBeenCalledWith('salesInvoice');
    expect(
      salesInvoicePrintService.renderSalesInvoiceHtml,
    ).toHaveBeenCalledWith(WORKSPACE_ID, RECORD_ID);
    expect(
      salesShipmentPrintService.renderSalesShipmentUpdHtml,
    ).not.toHaveBeenCalled();
    expect(result.html).toBe('<html>schet</html>');
  });

  it('renders the УПД print service (default status «2») for documentType UPD', async () => {
    const {
      printTemplateService,
      salesInvoicePrintService,
      salesShipmentPrintService,
    } = buildServices({
      html: '<div></div>',
      source: 'built-in',
      fallbackReason: null,
    });
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createRenderPrintPreviewTool(
      printTemplateService,
      salesInvoicePrintService,
      salesShipmentPrintService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    const result = await tool.execute({
      documentType: 'UPD',
      recordId: RECORD_ID,
    });

    expect(assertCanReadObjectRecords).toHaveBeenCalledWith('salesShipment');
    expect(
      salesShipmentPrintService.renderSalesShipmentUpdHtml,
    ).toHaveBeenCalledWith(WORKSPACE_ID, RECORD_ID, '2');
    expect(
      salesInvoicePrintService.renderSalesInvoiceHtml,
    ).not.toHaveBeenCalled();
    expect(result.html).toBe('<html>upd</html>');
  });

  it('reports an override placeholder unknown to the print service as unfilled', async () => {
    const {
      printTemplateService,
      salesInvoicePrintService,
      salesShipmentPrintService,
    } = buildServices({
      html: '<div>{{invoice_number}} {{clown_car}}</div>',
      source: 'custom',
      fallbackReason: null,
    });
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createRenderPrintPreviewTool(
      printTemplateService,
      salesInvoicePrintService,
      salesShipmentPrintService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    const result = await tool.execute({
      documentType: 'SCHET',
      recordId: RECORD_ID,
    });

    expect(result.source).toBe('custom');
    expect(result.unfilledPlaceholders).toEqual(['clown_car']);
  });

  it('reports no unfilled placeholders and a fallback reason when the override was rejected', async () => {
    const {
      printTemplateService,
      salesInvoicePrintService,
      salesShipmentPrintService,
    } = buildServices({
      html: '<div>{{invoice_number}}</div>',
      source: 'built-in',
      fallbackReason:
        'Активный шаблон печати пуст — используется встроенный шаблон.',
    });
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createRenderPrintPreviewTool(
      printTemplateService,
      salesInvoicePrintService,
      salesShipmentPrintService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    const result = await tool.execute({
      documentType: 'SCHET',
      recordId: RECORD_ID,
    });

    expect(result.unfilledPlaceholders).toEqual([]);
    expect(result.fallbackReason).toMatch(/пуст/);
  });
});
