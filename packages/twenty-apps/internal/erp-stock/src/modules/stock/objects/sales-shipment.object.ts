import { defineObject, FieldType } from 'twenty-sdk/define';
import { DocStatus } from './goods-receipt.object';

export const SALES_SHIPMENT_UNIVERSAL_IDENTIFIER =
  '76f05a56-2f6e-4feb-820c-67c14bcdc9b9';

export const SALES_SHIPMENT_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '30676c05-a7e2-4931-bc48-312395de322d';

export default defineObject({
  universalIdentifier: SALES_SHIPMENT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'salesShipment',
  namePlural: 'salesShipments',
  labelSingular: 'Реализация товаров',
  labelPlural: 'Реализации товаров',
  description: 'Отгрузка товаров покупателю со склада',
  icon: 'IconPackageExport',
  labelIdentifierFieldMetadataUniversalIdentifier:
    SALES_SHIPMENT_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: SALES_SHIPMENT_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Например «Реализация № 7 от 25.08.2026» — заполняется сервером при проведении',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: 'a6675ae1-7dac-451d-ba59-61823676b2a5',
      type: FieldType.TEXT,
      name: 'number',
      label: 'Номер',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'a7fad627-3a7b-41b3-a902-1514954bd1e4',
      type: FieldType.SELECT,
      name: 'docStatus',
      label: 'Статус',
      icon: 'IconProgressCheck',
      defaultValue: `'${DocStatus.DRAFT}'`,
      options: [
        {
          id: '0e265ab9-01b7-4cc1-9efe-cc21b1b7af12',
          value: DocStatus.DRAFT,
          label: 'Черновик',
          position: 0,
          color: 'gray',
        },
        {
          id: 'c4aa1288-92c0-4493-81b0-a0e8fbe2f652',
          value: DocStatus.POSTED,
          label: 'Проведён',
          position: 1,
          color: 'green',
        },
        {
          id: 'c4ad2255-37e8-4ee3-81f8-b38cf0f947dc',
          value: DocStatus.CANCELLED,
          label: 'Отменён',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: '4b8335f9-8451-4618-933e-8228f23ecbce',
      type: FieldType.DATE,
      name: 'postingDate',
      label: 'Дата проведения',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: 'f7879822-4dac-4351-945c-03aa7cd7d4a6',
      type: FieldType.DATE_TIME,
      name: 'postedAt',
      label: 'Проведён в',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: '5cb090a0-e52e-4b40-99fc-fac0c405f2f7',
      type: FieldType.DATE_TIME,
      name: 'cancelledAt',
      label: 'Отменён в',
      icon: 'IconBan',
      isNullable: true,
    },
    {
      universalIdentifier: '37a02f0e-c2b6-4252-9c5d-b8cd809f94ca',
      type: FieldType.CURRENCY,
      name: 'totalCost',
      label: 'Себестоимость',
      description: 'Себестоимость списания — заполняется проведением',
      icon: 'IconSum',
      isNullable: true,
    },
    {
      universalIdentifier: 'c4da59c0-5886-4f57-8383-8a22e665df0b',
      type: FieldType.TEXT,
      name: 'comment',
      label: 'Комментарий',
      icon: 'IconNotes',
      isNullable: true,
    },
  ],
});
