import { HeadlessEngineCommandWrapperEffect } from '@/command-menu-item/engine-command/components/HeadlessEngineCommandWrapperEffect';
import { useErpPostingCommand } from '@/erp-documents/hooks/useErpPostingCommand';

export const CancelErpDocumentCommand = () => {
  const { execute } = useErpPostingCommand('cancel');

  return <HeadlessEngineCommandWrapperEffect execute={execute} />;
};
