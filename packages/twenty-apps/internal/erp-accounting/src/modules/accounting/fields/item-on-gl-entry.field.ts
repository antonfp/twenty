import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { GL_ENTRY_UNIVERSAL_IDENTIFIER } from '../objects/gl-entry.object';
import { ITEM_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';

export const ITEM_ON_GL_ENTRY_ID = 'b891c7a5-4501-4dca-9f53-7e2b5c2b75d6';
export const GL_ENTRIES_ON_ITEM_ID = '153d40b2-e957-43c3-81f3-c4f3716fd45e';

export default defineField({
  universalIdentifier: ITEM_ON_GL_ENTRY_ID,
  objectUniversalIdentifier: GL_ENTRY_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'item',
  label: 'Номенклатура',
  icon: 'IconPackage',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: ITEM_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: GL_ENTRIES_ON_ITEM_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'itemId',
  },
});
