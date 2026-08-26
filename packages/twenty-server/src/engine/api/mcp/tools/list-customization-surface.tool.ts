import { z } from 'zod';

import {
  type CustomizationSurfaceObjectEntry,
  type ErpCustomizationSurfaceService,
} from 'src/engine/core-modules/erp/services/erp-customization-surface.service';

export const LIST_CUSTOMIZATION_SURFACE_TOOL_NAME =
  'list_customization_surface';

export const listCustomizationSurfaceInputSchema = z.object({});

export type ListCustomizationSurfaceResult = {
  objects: CustomizationSurfaceObjectEntry[];
  message: string;
};

// Read-only, ungated (like list_object_metadata_names/get_object_metadata):
// schema shape is not sensitive, and the agent needs this to decide WHAT it
// can propose before attempting a customization tool that IS admin-gated
// (create_field_metadata/create_view via execute_tool, guarded by
// ErpMetadataToolGuardService).
export const createListCustomizationSurfaceTool = (
  erpCustomizationSurfaceService: ErpCustomizationSurfaceService,
  workspaceId: string,
) => ({
  description:
    'Что можно кастомизировать в этом workspace: список объектов с их происхождением — ' +
    '"custom" (создан через AI/Settings, можно всё в пределах MVP), ' +
    '"app-owned" (часть установленного приложения, например erp-sales — можно ДОБАВЛЯТЬ поля, но не менять/удалять существующие), ' +
    '"register" (регистр — партийный/складской/GL-учёт или остатки товаров, формируется автоматически при проведении документов — поля, вьюхи и любые изменения запрещены). ' +
    'canAddFields показывает, разрешено ли на этот объект добавлять кастомные поля через create_field_metadata. ' +
    'Call this before proposing an object/field/view customization to know which objects are off-limits.',
  inputSchema: listCustomizationSurfaceInputSchema,
  execute: async (): Promise<ListCustomizationSurfaceResult> => {
    const objects =
      await erpCustomizationSurfaceService.listCustomizationSurface(
        workspaceId,
      );

    return {
      objects,
      message: `${objects.length} object(s); registers and add-field eligibility are pre-computed in "origin"/"canAddFields".`,
    };
  },
});
