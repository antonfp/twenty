import { defineObject, FieldType } from 'twenty-sdk/define';
import { DocStatus } from './supplier-invoice.object';

export const SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER =
  '2f73d8af-e9c2-4657-921e-3bd267d3e639';

export const SUPPLIER_PAYMENT_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  'a204da49-77f7-46e4-ae16-7440170b2975';

export default defineObject({
  universalIdentifier: SUPPLIER_PAYMENT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'supplierPayment',
  namePlural: 'supplierPayments',
  labelSingular: 'Оплата поставщику',
  labelPlural: 'Оплаты поставщикам',
  description: 'Оплата поставщику',
  icon: 'IconCash',
  labelIdentifierFieldMetadataUniversalIdentifier:
    SUPPLIER_PAYMENT_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: SUPPLIER_PAYMENT_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '22cf7549-58cc-480c-bf2e-92ca70d6a93a',
      type: FieldType.TEXT,
      name: 'number',
      label: 'Номер',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: '51d5b6b8-67ed-457e-bc7c-b26f01e67c23',
      type: FieldType.DATE,
      name: 'paymentDate',
      label: 'Дата оплаты',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: 'd750ffff-1c7e-48e9-85e7-1fef892563eb',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Сумма',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
    {
      universalIdentifier: '3bd7d2db-b704-4cf6-a8d4-37a5528ebc63',
      type: FieldType.SELECT,
      name: 'docStatus',
      label: 'Статус',
      icon: 'IconProgressCheck',
      defaultValue: `'${DocStatus.DRAFT}'`,
      options: [
        {
          id: '06f21ef1-fea5-462a-bc5d-c0241b1382c4',
          value: DocStatus.DRAFT,
          label: 'Черновик',
          position: 0,
          color: 'gray',
        },
        {
          id: 'a2405c34-4be3-4670-b9e3-a1c7c2b30eda',
          value: DocStatus.POSTED,
          label: 'Проведён',
          position: 1,
          color: 'green',
        },
        {
          id: 'db5e5a29-c2ce-4d9e-9d7e-0935e11614cb',
          value: DocStatus.CANCELLED,
          label: 'Отменён',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: 'ded60362-3e3d-43ce-bb49-461980439e88',
      type: FieldType.DATE,
      name: 'postingDate',
      label: 'Дата проведения',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: '81bab479-09dd-47d2-8a1f-43bbeeb37c55',
      type: FieldType.DATE_TIME,
      name: 'postedAt',
      label: 'Проведён в',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: 'a6614a4c-45ed-45f6-93a8-adbb97eaa02a',
      type: FieldType.DATE_TIME,
      name: 'cancelledAt',
      label: 'Отменён в',
      icon: 'IconBan',
      isNullable: true,
    },
    {
      universalIdentifier: '891f76f1-f995-4c7a-9426-b978053050f4',
      type: FieldType.TEXT,
      name: 'comment',
      label: 'Комментарий',
      icon: 'IconNotes',
      isNullable: true,
    },
  ],
});
