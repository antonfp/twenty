import { defineObject, FieldType } from 'twenty-sdk/define';

export enum DocStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  CANCELLED = 'CANCELLED',
}

enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export const SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER =
  'e635330e-2de5-4b54-a527-9ec255dab0d2';

export const SUPPLIER_INVOICE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '958054c7-d00a-4895-8b2f-d708a4939511';

export default defineObject({
  universalIdentifier: SUPPLIER_INVOICE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'supplierInvoice',
  namePlural: 'supplierInvoices',
  labelSingular: 'Счёт поставщика',
  labelPlural: 'Счета поставщиков',
  description: 'Счёт на оплату от поставщика',
  icon: 'IconFileInvoice',
  labelIdentifierFieldMetadataUniversalIdentifier:
    SUPPLIER_INVOICE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: SUPPLIER_INVOICE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Например «Счёт поставщика № 7 от 25.08.2026» — заполняется сервером при проведении',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: 'f6a14d24-fc8c-4834-a09a-7153ae8a24f2',
      type: FieldType.TEXT,
      name: 'number',
      label: 'Номер',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'dc613483-e35e-4c1b-a698-255535ea7050',
      type: FieldType.DATE,
      name: 'invoiceDate',
      label: 'Дата счёта',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: '8d6c8cf3-2797-49ac-aa1d-0bfe35dc654e',
      type: FieldType.SELECT,
      name: 'docStatus',
      label: 'Статус',
      icon: 'IconProgressCheck',
      defaultValue: `'${DocStatus.DRAFT}'`,
      options: [
        {
          id: 'dd5fd963-e1d0-4f93-adcb-71f4ec655bb5',
          value: DocStatus.DRAFT,
          label: 'Черновик',
          position: 0,
          color: 'gray',
        },
        {
          id: '8ea7ccaf-d3d7-4316-9b31-1354f8ae568b',
          value: DocStatus.POSTED,
          label: 'Проведён',
          position: 1,
          color: 'green',
        },
        {
          id: '2e453156-16ed-4e39-a560-a3920bbdf51b',
          value: DocStatus.CANCELLED,
          label: 'Отменён',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: 'af719041-0dbf-44cc-8bbf-96f634eb6675',
      type: FieldType.DATE,
      name: 'postingDate',
      label: 'Дата проведения',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: '08878e5b-85bb-4fce-80db-8888e181d34f',
      type: FieldType.DATE_TIME,
      name: 'postedAt',
      label: 'Проведён в',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: '994148d5-cbb3-48d4-b904-ce40f1cf2dbd',
      type: FieldType.DATE_TIME,
      name: 'cancelledAt',
      label: 'Отменён в',
      icon: 'IconBan',
      isNullable: true,
    },
    {
      universalIdentifier: '1f61f532-ca71-425a-951f-65c8d9301342',
      type: FieldType.CURRENCY,
      name: 'total',
      label: 'Итого',
      icon: 'IconSum',
      isNullable: true,
    },
    {
      universalIdentifier: 'e9274291-e759-4e26-b8af-28f6e66ca746',
      type: FieldType.CURRENCY,
      name: 'vatTotal',
      label: 'В т.ч. НДС',
      icon: 'IconPercentage',
      isNullable: true,
    },
    {
      universalIdentifier: 'dafe960d-dd62-4925-8214-6b6a62b64611',
      type: FieldType.SELECT,
      name: 'paymentStatus',
      label: 'Оплата',
      icon: 'IconCreditCard',
      defaultValue: `'${PaymentStatus.UNPAID}'`,
      options: [
        {
          id: 'ff45194d-7a8d-4ba3-a662-f9d846c81e62',
          value: PaymentStatus.UNPAID,
          label: 'Не оплачен',
          position: 0,
          color: 'gray',
        },
        {
          id: 'b392b82a-d701-4c6c-9eef-bed4c2be1bf5',
          value: PaymentStatus.PARTIALLY_PAID,
          label: 'Частично оплачен',
          position: 1,
          color: 'yellow',
        },
        {
          id: 'dd009e2e-9f73-4387-8f6e-f8ea5149aef8',
          value: PaymentStatus.PAID,
          label: 'Оплачен',
          position: 2,
          color: 'green',
        },
      ],
    },
    {
      universalIdentifier: '1437f080-5638-4321-baf9-dc27df3e2354',
      type: FieldType.CURRENCY,
      name: 'paidAmount',
      label: 'Оплачено',
      icon: 'IconCash',
      isNullable: true,
    },
    {
      universalIdentifier: '75609e74-5ad6-4f7c-ab32-46dffa46b766',
      type: FieldType.TEXT,
      name: 'comment',
      label: 'Комментарий',
      icon: 'IconNotes',
      isNullable: true,
    },
  ],
});
