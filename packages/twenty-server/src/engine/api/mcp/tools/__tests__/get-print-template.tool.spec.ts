import { ForbiddenException } from '@nestjs/common';

import { createGetPrintTemplateTool } from 'src/engine/api/mcp/tools/get-print-template.tool';
import { type PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

const buildPrintTemplateService = (resolved: {
  html: string;
  source: 'custom' | 'built-in';
  fallbackReason: string | null;
}) =>
  ({
    findActiveTemplate: jest.fn().mockResolvedValue(null),
    resolveTemplateHtml: jest.fn().mockReturnValue(resolved),
  }) as unknown as PrintTemplateService;

describe('createGetPrintTemplateTool', () => {
  it('refuses when the calling role lacks read permission on printTemplate', async () => {
    const printTemplateService = buildPrintTemplateService({
      html: '<div></div>',
      source: 'built-in',
      fallbackReason: null,
    });
    const assertCanReadObjectRecords = jest
      .fn()
      .mockRejectedValue(new ForbiddenException('нет прав'));

    const tool = createGetPrintTemplateTool(
      printTemplateService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    await expect(tool.execute({ documentType: 'SCHET' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(assertCanReadObjectRecords).toHaveBeenCalledWith('printTemplate');
  });

  it('reports the built-in template plus its known placeholders when no override is active', async () => {
    const printTemplateService = buildPrintTemplateService({
      html: '<div>{{invoice_number}}</div>',
      source: 'built-in',
      fallbackReason: null,
    });
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createGetPrintTemplateTool(
      printTemplateService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    const result = await tool.execute({ documentType: 'SCHET' });

    expect(result.source).toBe('built-in');
    expect(result.fallbackReason).toBeNull();
    expect(result.availablePlaceholders).toContain('invoice_number');
    expect(result.availablePlaceholders).toContain('item_name');
  });

  it('reports a fallback reason when an active override was rejected as unusable', async () => {
    const printTemplateService = buildPrintTemplateService({
      html: '<div>built-in</div>',
      source: 'built-in',
      fallbackReason:
        'Активный шаблон печати пуст — используется встроенный шаблон.',
    });
    const assertCanReadObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createGetPrintTemplateTool(
      printTemplateService,
      WORKSPACE_ID,
      assertCanReadObjectRecords,
    );

    const result = await tool.execute({ documentType: 'UPD' });

    expect(result.fallbackReason).toMatch(/пуст/);
  });
});
