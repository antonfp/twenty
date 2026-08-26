import { Injectable } from '@nestjs/common';

import { type ToolSet } from 'ai';
import { PermissionFlagType } from 'twenty-shared/constants';

import { type GenerateDescriptorOptions } from 'src/engine/core-modules/tool-provider/interfaces/generate-descriptor-options.type';
import { type ToolProvider } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider.interface';
import { type ToolProviderContext } from 'src/engine/core-modules/tool-provider/interfaces/tool-provider-context.type';

import { ToolCategory } from 'twenty-shared/ai';
import { ErpMetadataToolGuardService } from 'src/engine/core-modules/erp/services/erp-metadata-tool-guard.service';
import { type ToolDescriptor } from 'src/engine/core-modules/tool-provider/types/tool-descriptor.type';
import { type ToolIndexEntry } from 'src/engine/core-modules/tool-provider/types/tool-index-entry.type';
import { executeToolFromToolSet } from 'src/engine/core-modules/tool-provider/utils/execute-tool-from-tool-set.util';
import { toolSetToDescriptors } from 'src/engine/core-modules/tool-provider/utils/tool-set-to-descriptors.util';
import { type ToolOutput } from 'src/engine/core-modules/tool/types/tool-output.type';
import { PermissionsService } from 'src/engine/metadata-modules/permissions/permissions.service';
import { ViewFieldToolsFactory } from 'src/engine/metadata-modules/view-field/tools/view-field-tools.factory';
import { ViewFilterToolsFactory } from 'src/engine/metadata-modules/view-filter/tools/view-filter-tools.factory';
import { ViewSortToolsFactory } from 'src/engine/metadata-modules/view-sort/tools/view-sort-tools.factory';
import { ViewToolsFactory } from 'src/engine/metadata-modules/view/tools/view-tools.factory';

@Injectable()
export class ViewToolProvider implements ToolProvider {
  readonly category = ToolCategory.VIEW;

  constructor(
    private readonly viewToolsFactory: ViewToolsFactory,
    private readonly viewFieldToolsFactory: ViewFieldToolsFactory,
    private readonly viewFilterToolsFactory: ViewFilterToolsFactory,
    private readonly viewSortToolsFactory: ViewSortToolsFactory,
    private readonly permissionsService: PermissionsService,
    private readonly erpMetadataToolGuardService: ErpMetadataToolGuardService,
  ) {}

  async isAvailable(_context: ToolProviderContext): Promise<boolean> {
    return true;
  }

  async generateDescriptors(
    context: ToolProviderContext,
    options?: GenerateDescriptorOptions,
  ): Promise<(ToolIndexEntry | ToolDescriptor)[]> {
    const toolSet = await this.buildToolSet(context);

    return toolSetToDescriptors(toolSet, ToolCategory.VIEW, {
      includeSchemas: options?.includeSchemas ?? true,
    });
  }

  async executeStaticTool(
    toolName: string,
    args: Record<string, unknown>,
    context: ToolProviderContext,
  ): Promise<ToolOutput> {
    // Phase 8 "фронтир AI-кастомизации": only view CREATION on a register
    // object is refused here (RU); update_view/delete_view/get_views etc.
    // keep the existing VIEWS-flag permission model untouched — see
    // erp-metadata-tool-guard.service.ts for why this stays narrow.
    await this.erpMetadataToolGuardService.assertToolCallAllowed({
      toolName,
      args,
      workspaceId: context.workspaceId,
      roleId: context.roleId,
    });

    const toolSet = await this.buildToolSet(context);

    return executeToolFromToolSet(toolSet, toolName, args, ToolCategory.VIEW);
  }

  private async buildToolSet(context: ToolProviderContext): Promise<ToolSet> {
    const workspaceMemberId = context.actorContext?.workspaceMemberId;
    const userWorkspaceId = context.userWorkspaceId;

    const readTools = {
      ...this.viewToolsFactory.generateReadTools(
        context.workspaceId,
        userWorkspaceId,
        workspaceMemberId ?? undefined,
      ),
      ...this.viewFieldToolsFactory.generateReadTools(context.workspaceId),
      ...this.viewFilterToolsFactory.generateReadTools(context.workspaceId),
      ...this.viewSortToolsFactory.generateReadTools(context.workspaceId),
    };

    const hasViewPermission =
      await this.permissionsService.checkRolesPermissions(
        context.rolePermissionConfig,
        context.workspaceId,
        PermissionFlagType.VIEWS,
      );

    if (!hasViewPermission) {
      return readTools;
    }

    const writeTools = {
      ...this.viewToolsFactory.generateWriteTools(
        context.workspaceId,
        userWorkspaceId,
      ),
      ...this.viewFieldToolsFactory.generateWriteTools(context.workspaceId),
      ...this.viewFilterToolsFactory.generateWriteTools(context.workspaceId),
      ...this.viewSortToolsFactory.generateWriteTools(context.workspaceId),
    };

    return { ...readTools, ...writeTools };
  }
}
