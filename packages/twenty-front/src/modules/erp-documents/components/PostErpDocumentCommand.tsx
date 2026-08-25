import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useErpPostingCommand } from '@/erp-documents/hooks/useErpPostingCommand';

export const PostErpDocumentCommand = () => {
  const { execute } = useErpPostingCommand('post');

  return <HeadlessEngineCommandWrapperEffect execute={execute} />;
};
