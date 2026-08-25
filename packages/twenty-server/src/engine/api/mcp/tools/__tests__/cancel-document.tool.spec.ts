import { ForbiddenException } from '@nestjs/common';

import { createCancelDocumentTool } from 'src/engine/api/mcp/tools/cancel-document.tool';
import { type PostingService } from 'src/engine/core-modules/erp/services/posting.service';

const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const RECORD_ID = '30303030-0d5c-4a83-91d7-63f5b1a2f001';
const OBJECT_NAME_SINGULAR = 'salesInvoice';

const buildPostingService = () =>
  ({
    cancel: jest.fn().mockResolvedValue(undefined),
  }) as unknown as PostingService;

// Covers the MCP fast-follow: cancel_document must check
// canUpdateObjectRecords for the calling role before touching PostingService,
// via the same ErpObjectPermissionGuardService callback the resolver uses.
describe('createCancelDocumentTool — permission check', () => {
  it('refuses when the calling role lacks the permission', async () => {
    const postingService = buildPostingService();
    const assertCanUpdateObjectRecords = jest
      .fn()
      .mockRejectedValue(
        new ForbiddenException('Недостаточно прав: роль без права.'),
      );

    const tool = createCancelDocumentTool(
      postingService,
      WORKSPACE_ID,
      assertCanUpdateObjectRecords,
    );

    await expect(
      tool.execute({
        objectNameSingular: OBJECT_NAME_SINGULAR,
        recordId: RECORD_ID,
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(assertCanUpdateObjectRecords).toHaveBeenCalledWith(
      OBJECT_NAME_SINGULAR,
    );
    expect(postingService.cancel).not.toHaveBeenCalled();
  });

  it('proceeds once the permission check passes', async () => {
    const postingService = buildPostingService();
    const assertCanUpdateObjectRecords = jest.fn().mockResolvedValue(undefined);

    const tool = createCancelDocumentTool(
      postingService,
      WORKSPACE_ID,
      assertCanUpdateObjectRecords,
    );

    const result = await tool.execute({
      objectNameSingular: OBJECT_NAME_SINGULAR,
      recordId: RECORD_ID,
    });

    expect(result.success).toBe(true);
    expect(postingService.cancel).toHaveBeenCalledWith(
      WORKSPACE_ID,
      OBJECT_NAME_SINGULAR,
      RECORD_ID,
    );
  });
});
