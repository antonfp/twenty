import { ForbiddenException } from '@nestjs/common';

import { createUpdatePrintTemplateTool } from 'src/engine/api/mcp/tools/update-print-template.tool';
import { type PrintTemplateService } from 'src/engine/core-modules/erp/services/print-template.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';

describe('createUpdatePrintTemplateTool', () => {
  it('refuses when the calling role lacks update permission on printTemplate', async () => {
    const printTemplateService = {
      createOrUpdateActiveTemplate: jest.fn(),
    } as unknown as PrintTemplateService;
    const assertCanUpdateObjectRecords = jest
      .fn()
      .mockRejectedValue(new ForbiddenException('нет прав'));

    const tool = createUpdatePrintTemplateTool(
      printTemplateService,
      WORKSPACE_ID,
      assertCanUpdateObjectRecords,
    );

    await expect(
      tool.execute({ documentType: 'SCHET', html: '<div></div>' }),
    ).rejects.toThrow(ForbiddenException);
    expect(assertCanUpdateObjectRecords).toHaveBeenCalledWith('printTemplate');
    expect(
      printTemplateService.createOrUpdateActiveTemplate,
    ).not.toHaveBeenCalled();
  });

  it('creates or updates the active override once permission passes', async () => {
    const printTemplateService = {
      createOrUpdateActiveTemplate: jest
        .fn()
        .mockResolvedValue({ id: 'tpl-1' }),
    } as unknown as PrintTemplateService;
    const assertCanUpdateObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createUpdatePrintTemplateTool(
      printTemplateService,
      WORKSPACE_ID,
      assertCanUpdateObjectRecords,
    );

    const result = await tool.execute({
      documentType: 'SCHET',
      html: '<div>Спасибо за покупку!</div>',
    });

    expect(result.success).toBe(true);
    expect(result.id).toBe('tpl-1');
    expect(
      printTemplateService.createOrUpdateActiveTemplate,
    ).toHaveBeenCalledWith(
      WORKSPACE_ID,
      'SCHET',
      '<div>Спасибо за покупку!</div>',
    );
  });
});
