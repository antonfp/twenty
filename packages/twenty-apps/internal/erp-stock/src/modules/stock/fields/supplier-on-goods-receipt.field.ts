import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { GOODS_RECEIPT_UNIVERSAL_IDENTIFIER } from '../objects/goods-receipt.object';

export const SUPPLIER_ON_GOODS_RECEIPT_ID = '9f0dfeb1-4e6a-4bd8-9fd1-fa7e521e5a13';
export const GOODS_RECEIPTS_ON_COMPANY_ID = '37ceea0b-01c0-4673-9928-c2703351dedc';

export default defineField({
  universalIdentifier: SUPPLIER_ON_GOODS_RECEIPT_ID,
  objectUniversalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'supplier',
  label: 'Поставщик',
  icon: 'IconBuildingSkyscraper',
  relationTargetObjectMetadataUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.company.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: GOODS_RECEIPTS_ON_COMPANY_ID,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'supplierId',
  },
});
