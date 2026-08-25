import { defineObject, FieldType } from 'twenty-sdk/define';
import { DocStatus } from './goods-receipt.object';

export const GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER =
  'f44f0b36-a76e-41df-9ba5-e3647a623f01';

export const GOODS_WRITE_OFF_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '3f7b404e-dc83-4cd7-977d-6a73ed4164ee';

export default defineObject({
  universalIdentifier: GOODS_WRITE_OFF_UNIVERSAL_IDENTIFIER,
  nameSingular: 'goodsWriteOff',
  namePlural: 'goodsWriteOffs',
  labelSingular: 'Списание товаров',
  labelPlural: 'Списания товаров',
  description: 'Списание товаров со склада',
  icon: 'IconPackageOff',
  labelIdentifierFieldMetadataUniversalIdentifier:
    GOODS_WRITE_OFF_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: GOODS_WRITE_OFF_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Например «Списание № 7 от 25.08.2026» — заполняется сервером при проведении',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: 'de6da0a7-9093-4b3c-8ded-1410c1b0989c',
      type: FieldType.TEXT,
      name: 'number',
      label: 'Номер',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'efc9eb5f-7636-4718-8d91-c9f357e612f8',
      type: FieldType.SELECT,
      name: 'docStatus',
      label: 'Статус',
      icon: 'IconProgressCheck',
      defaultValue: `'${DocStatus.DRAFT}'`,
      options: [
        {
          id: 'fdfc2aa1-ffa7-46b1-b1e2-9cf6c7e82e86',
          value: DocStatus.DRAFT,
          label: 'Черновик',
          position: 0,
          color: 'gray',
        },
        {
          id: 'f0179b7e-152b-4cc2-89ac-7fa8166cb55a',
          value: DocStatus.POSTED,
          label: 'Проведён',
          position: 1,
          color: 'green',
        },
        {
          id: '68f7b689-254d-48ee-a3ed-4079478fbf91',
          value: DocStatus.CANCELLED,
          label: 'Отменён',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: '9b7eda18-80fb-46f4-81a1-dd8d3084176e',
      type: FieldType.DATE,
      name: 'postingDate',
      label: 'Дата проведения',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: 'b8b96373-06e4-479e-b549-0aa4a2da1fa0',
      type: FieldType.DATE_TIME,
      name: 'postedAt',
      label: 'Проведён в',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: 'aaa3b7c7-2db2-407d-83fa-07796c141bca',
      type: FieldType.DATE_TIME,
      name: 'cancelledAt',
      label: 'Отменён в',
      icon: 'IconBan',
      isNullable: true,
    },
  ],
});
