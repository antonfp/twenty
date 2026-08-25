import { z } from 'zod';

import { type PostingService } from 'src/engine/core-modules/erp/services/posting.service';

export const POST_DOCUMENT_TOOL_NAME = 'post_document';

export const postDocumentInputSchema = z.object({
  objectNameSingular: z
    .string()
    .min(1)
    .describe('Singular object name of the document, e.g. "salesInvoice"'),
  recordId: z.string().uuid().describe('Id of the document record to post'),
});

export type PostDocumentResult = {
  success: boolean;
  message: string;
};

export const createPostDocumentTool = (
  postingService: PostingService,
  workspaceId: string,
) => ({
  description:
    'Post (провести) an ERP document: atomically writes its register entries (ledgers) and switches docStatus from DRAFT to POSTED. Fails if the document is not in DRAFT status.',
  inputSchema: postDocumentInputSchema,
  execute: async ({
    objectNameSingular,
    recordId,
  }: z.infer<typeof postDocumentInputSchema>): Promise<PostDocumentResult> => {
    await postingService.post(workspaceId, objectNameSingular, recordId);

    return {
      success: true,
      message: `Document ${objectNameSingular}/${recordId} posted.`,
    };
  },
});
