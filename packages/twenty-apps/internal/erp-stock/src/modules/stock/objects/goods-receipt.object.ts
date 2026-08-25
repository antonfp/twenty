import { defineObject, FieldType } from 'twenty-sdk/define';

export enum DocStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  CANCELLED = 'CANCELLED',
}

export const GOODS_RECEIPT_UNIVERSAL_IDENTIFIER =
  'b58e4fdb-4543-4110-99a7-33b0c8cc07c2';

export const GOODS_RECEIPT_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '207c4343-22da-462a-b629-ba8ca7afec50';

export default defineObject({
  universalIdentifier: GOODS_RECEIPT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'goodsReceipt',
  namePlural: 'goodsReceipts',
  labelSingular: 'Поступление товаров',
  labelPlural: 'Поступления товаров',
  description: 'Поступление товаров от поставщика на склад',
  icon: 'IconPackageImport',
  labelIdentifierFieldMetadataUniversalIdentifier:
    GOODS_RECEIPT_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: GOODS_RECEIPT_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Например «Поступление № 7 от 25.08.2026» — заполняется сервером при проведении',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '303ad686-0283-4b8b-9fec-9694dbfaddac',
      type: FieldType.TEXT,
      name: 'number',
      label: 'Номер',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'c2c68aad-b494-41d0-b1fd-a5b0c608fac4',
      type: FieldType.SELECT,
      name: 'docStatus',
      label: 'Статус',
      icon: 'IconProgressCheck',
      defaultValue: `'${DocStatus.DRAFT}'`,
      options: [
        {
          id: 'a42bca34-a785-4e3e-8fac-0083dd8219fe',
          value: DocStatus.DRAFT,
          label: 'Черновик',
          position: 0,
          color: 'gray',
        },
        {
          id: 'f38d8180-9876-463e-8cc6-a749c54adda9',
          value: DocStatus.POSTED,
          label: 'Проведён',
          position: 1,
          color: 'green',
        },
        {
          id: 'ffa0e303-bdcb-48c8-9e6e-a2ad794689a3',
          value: DocStatus.CANCELLED,
          label: 'Отменён',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: '56070b9f-fb61-4d0e-9b30-335eaea2f9c1',
      type: FieldType.DATE,
      name: 'postingDate',
      label: 'Дата проведения',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: 'c98ab3f9-dd05-4963-815a-d984778fc3ed',
      type: FieldType.DATE_TIME,
      name: 'postedAt',
      label: 'Проведён в',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: '5d999eb4-e277-4175-b170-4ae2ede41a43',
      type: FieldType.DATE_TIME,
      name: 'cancelledAt',
      label: 'Отменён в',
      icon: 'IconBan',
      isNullable: true,
    },
    {
      universalIdentifier: '070af511-9f0b-4783-8a38-f59d57aed56f',
      type: FieldType.CURRENCY,
      name: 'total',
      label: 'Итого',
      description: 'Себестоимость прихода — заполняется проведением',
      icon: 'IconSum',
      isNullable: true,
    },
    {
      universalIdentifier: '12e4cea3-3b58-4c3f-ac51-c0e7198d1e9d',
      type: FieldType.TEXT,
      name: 'comment',
      label: 'Комментарий',
      icon: 'IconNotes',
      isNullable: true,
    },
  ],
});
