import { defineObject, FieldType } from 'twenty-sdk/define';
import { DocStatus } from './goods-receipt.object';

export const STOCK_TRANSFER_UNIVERSAL_IDENTIFIER =
  '074a8f44-5274-4f12-9bb4-385659aa6356';

export const STOCK_TRANSFER_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '4e11f36f-a584-4262-a367-80bdb88714ab';

export default defineObject({
  universalIdentifier: STOCK_TRANSFER_UNIVERSAL_IDENTIFIER,
  nameSingular: 'stockTransfer',
  namePlural: 'stockTransfers',
  labelSingular: 'Перемещение товаров',
  labelPlural: 'Перемещения товаров',
  description: 'Перемещение товаров между складами',
  icon: 'IconTransfer',
  labelIdentifierFieldMetadataUniversalIdentifier:
    STOCK_TRANSFER_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: STOCK_TRANSFER_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Например «Перемещение № 7 от 25.08.2026» — заполняется сервером при проведении',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '562f1123-5c17-461f-af62-1ac9f157dc83',
      type: FieldType.TEXT,
      name: 'number',
      label: 'Номер',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: '3384ce10-6c72-4a1d-a680-a33c1903dedb',
      type: FieldType.SELECT,
      name: 'docStatus',
      label: 'Статус',
      icon: 'IconProgressCheck',
      defaultValue: `'${DocStatus.DRAFT}'`,
      options: [
        {
          id: '09015e1d-3d67-43fe-bc6c-e133b51906cc',
          value: DocStatus.DRAFT,
          label: 'Черновик',
          position: 0,
          color: 'gray',
        },
        {
          id: 'f4a0c155-bd5e-4699-b33c-6bca96c630db',
          value: DocStatus.POSTED,
          label: 'Проведён',
          position: 1,
          color: 'green',
        },
        {
          id: 'ae5b12de-d5ae-4bce-9c16-e0ffb0d5870c',
          value: DocStatus.CANCELLED,
          label: 'Отменён',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: 'ad4b2947-2ac1-4c57-9df1-42354e77792b',
      type: FieldType.DATE,
      name: 'postingDate',
      label: 'Дата проведения',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: '7501aca2-8c4c-4be0-8f65-6346413a2f8b',
      type: FieldType.DATE_TIME,
      name: 'postedAt',
      label: 'Проведён в',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: 'f780e683-7e3a-4608-a89b-3349e1003e79',
      type: FieldType.DATE_TIME,
      name: 'cancelledAt',
      label: 'Отменён в',
      icon: 'IconBan',
      isNullable: true,
    },
  ],
});
