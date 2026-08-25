import { z } from 'zod';

import { type PostingService } from 'src/engine/core-modules/erp/services/posting.service';

export const CANCEL_DOCUMENT_TOOL_NAME = 'cancel_document';

export const cancelDocumentInputSchema = z.object({
  objectNameSingular: z
    .string()
    .min(1)
    .describe('Singular object name of the document, e.g. "salesInvoice"'),
  recordId: z.string().uuid().describe('Id of the document record to cancel'),
});

export type CancelDocumentResult = {
  success: boolean;
  message: string;
};

export const createCancelDocumentTool = (
  postingService: PostingService,
  workspaceId: string,
) => ({
  description:
    'Cancel (отменить проведение) a POSTED ERP document: writes reversal (storno) register entries and switches docStatus to CANCELLED. Fails if the document is not POSTED.',
  inputSchema: cancelDocumentInputSchema,
  execute: async ({
    objectNameSingular,
    recordId,
  }: z.infer<typeof cancelDocumentInputSchema>): Promise<CancelDocumentResult> => {
    await postingService.cancel(workspaceId, objectNameSingular, recordId);

    return {
      success: true,
      message: `Document ${objectNameSingular}/${recordId} cancelled.`,
    };
  },
});
