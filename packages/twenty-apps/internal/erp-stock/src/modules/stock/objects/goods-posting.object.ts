import { defineObject, FieldType } from 'twenty-sdk/define';
import { DocStatus } from './goods-receipt.object';

export const GOODS_POSTING_UNIVERSAL_IDENTIFIER =
  'e82edcbb-ff58-4d81-afa7-026afc486e84';

export const GOODS_POSTING_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '0285ac2e-229d-4d41-bb82-81d4ae3c666f';

export default defineObject({
  universalIdentifier: GOODS_POSTING_UNIVERSAL_IDENTIFIER,
  nameSingular: 'goodsPosting',
  namePlural: 'goodsPostings',
  labelSingular: 'Оприходование товаров',
  labelPlural: 'Оприходования товаров',
  description: 'Оприходование товаров на склад (излишки, начальные остатки)',
  icon: 'IconPackages',
  labelIdentifierFieldMetadataUniversalIdentifier:
    GOODS_POSTING_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: GOODS_POSTING_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Например «Оприходование № 7 от 25.08.2026» — заполняется сервером при проведении',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: 'fa5519eb-e980-47fd-8b02-d97f7e47b1d1',
      type: FieldType.TEXT,
      name: 'number',
      label: 'Номер',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'cf160551-97b5-4ec7-959b-cc12a750384c',
      type: FieldType.SELECT,
      name: 'docStatus',
      label: 'Статус',
      icon: 'IconProgressCheck',
      defaultValue: `'${DocStatus.DRAFT}'`,
      options: [
        {
          id: '473ae8ed-3577-48c1-9971-99b298b008c6',
          value: DocStatus.DRAFT,
          label: 'Черновик',
          position: 0,
          color: 'gray',
        },
        {
          id: 'b5c5bbbc-b9bf-46e6-81cd-e8215c939bdf',
          value: DocStatus.POSTED,
          label: 'Проведён',
          position: 1,
          color: 'green',
        },
        {
          id: 'ad56fb05-16a7-4bbe-8047-cabf2efe3167',
          value: DocStatus.CANCELLED,
          label: 'Отменён',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: 'abe2c367-4f9f-4fbf-ad27-3d9480feda5c',
      type: FieldType.DATE,
      name: 'postingDate',
      label: 'Дата проведения',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: '9c4bca48-ea78-4477-a526-15a8624616fa',
      type: FieldType.DATE_TIME,
      name: 'postedAt',
      label: 'Проведён в',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: '8f3ff7ef-fcb5-4f23-9be3-d935eded47fd',
      type: FieldType.DATE_TIME,
      name: 'cancelledAt',
      label: 'Отменён в',
      icon: 'IconBan',
      isNullable: true,
    },
  ],
});
