import {
  defineField,
  FieldType,
  RelationType,
} from 'twenty-sdk/define';
import { GOODS_POSTING_UNIVERSAL_IDENTIFIER } from '../objects/goods-posting.object';
import { ORGANIZATION_UNIVERSAL_IDENTIFIER } from '../../../shared/erp-references';
import { ORGANIZATION_ON_GOODS_POSTING_ID, GOODS_POSTINGS_ON_ORGANIZATION_ID } from './organization-on-goods-posting.field';

export default defineField({
  universalIdentifier: GOODS_POSTINGS_ON_ORGANIZATION_ID,
  objectUniversalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'goodsPostings',
  label: 'Оприходования товаров',
  icon: 'IconPackages',
  relationTargetObjectMetadataUniversalIdentifier: GOODS_POSTING_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: ORGANIZATION_ON_GOODS_POSTING_ID,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
