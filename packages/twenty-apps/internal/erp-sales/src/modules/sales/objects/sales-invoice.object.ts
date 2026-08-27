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

export const SALES_INVOICE_UNIVERSAL_IDENTIFIER =
  'b5de66aa-2632-4ebf-8a72-5b7da875b34e';

export const SALES_INVOICE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  'ac9f4bdc-3395-4c4a-8010-9df0dcfcdfc5';

export default defineObject({
  universalIdentifier: SALES_INVOICE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'salesInvoice',
  namePlural: 'salesInvoices',
  labelSingular: 'Счёт покупателю',
  labelPlural: 'Счета покупателям',
  description: 'Счёт на оплату покупателю',
  icon: 'IconFileInvoice',
  labelIdentifierFieldMetadataUniversalIdentifier:
    SALES_INVOICE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: SALES_INVOICE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description:
        'Например «Счёт № 7 от 25.08.2026» — заполняется сервером при проведении',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '74459548-3a21-41a8-91f1-a322b37e85bb',
      type: FieldType.TEXT,
      name: 'number',
      label: 'Номер',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: '0835ef49-a3f4-40e9-9b39-9d177ec259e2',
      type: FieldType.DATE,
      name: 'invoiceDate',
      label: 'Дата счёта',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: '8a1d95c3-ba12-44c6-aace-abe05d7d5e48',
      type: FieldType.SELECT,
      name: 'docStatus',
      label: 'Статус',
      icon: 'IconProgressCheck',
      defaultValue: `'${DocStatus.DRAFT}'`,
      options: [
        {
          id: 'db2de039-9786-49cc-ad38-27b4689560b3',
          value: DocStatus.DRAFT,
          label: 'Черновик',
          position: 0,
          color: 'gray',
        },
        {
          id: 'd54cc049-7bf2-4f31-969c-fc18a4538400',
          value: DocStatus.POSTED,
          label: 'Проведён',
          position: 1,
          color: 'green',
        },
        {
          id: 'cb13daa5-3665-4a1b-9587-26f3689274d6',
          value: DocStatus.CANCELLED,
          label: 'Отменён',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: '71ecde44-156b-4b7a-9d4b-f797d5cc2072',
      type: FieldType.DATE,
      name: 'postingDate',
      label: 'Дата проведения',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: 'ee09c6fc-2be5-4b36-be59-89267215a9c3',
      type: FieldType.DATE_TIME,
      name: 'postedAt',
      label: 'Проведён в',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: '2af3a8fe-9db4-4d6a-9b9d-4eda08ba97ca',
      type: FieldType.DATE_TIME,
      name: 'cancelledAt',
      label: 'Отменён в',
      icon: 'IconBan',
      isNullable: true,
    },
    {
      universalIdentifier: '727dba6b-d14c-4dda-acc2-28b9096e7484',
      type: FieldType.CURRENCY,
      name: 'total',
      label: 'Итого',
      icon: 'IconSum',
      isNullable: true,
    },
    {
      universalIdentifier: '9ddeca99-d6a0-41fa-a69d-333aae9bdd0d',
      type: FieldType.CURRENCY,
      name: 'vatTotal',
      label: 'В т.ч. НДС',
      icon: 'IconPercentage',
      isNullable: true,
    },
    {
      universalIdentifier: '2b4f5c31-f2bd-4bcb-be00-acf7a15eeb4d',
      type: FieldType.SELECT,
      name: 'paymentStatus',
      label: 'Оплата',
      icon: 'IconCreditCard',
      defaultValue: `'${PaymentStatus.UNPAID}'`,
      options: [
        {
          id: '150650fa-8f5d-40a4-921c-c0293aea8b5c',
          value: PaymentStatus.UNPAID,
          label: 'Не оплачен',
          position: 0,
          color: 'gray',
        },
        {
          id: 'c8d34ab7-4cb6-4d2c-8a63-2f17f255c542',
          value: PaymentStatus.PARTIALLY_PAID,
          label: 'Частично оплачен',
          position: 1,
          color: 'yellow',
        },
        {
          id: '7cb0308d-0cc8-4918-b98a-490026cd193e',
          value: PaymentStatus.PAID,
          label: 'Оплачен',
          position: 2,
          color: 'green',
        },
      ],
    },
    {
      universalIdentifier: 'a8f0f2a1-61ac-42e1-80ac-2932813029c0',
      type: FieldType.CURRENCY,
      name: 'paidAmount',
      label: 'Оплачено',
      icon: 'IconCash',
      isNullable: true,
    },
    {
      universalIdentifier: 'b43ed94a-6c64-4939-bfcc-464a27cd6c8b',
      type: FieldType.TEXT,
      name: 'comment',
      label: 'Комментарий',
      icon: 'IconNotes',
      isNullable: true,
    },
    {
      universalIdentifier: 'caeb0dc9-5217-4ac6-833a-396a17a0c229',
      type: FieldType.NUMBER,
      name: 'revisionNumber',
      label: 'Номер исправления',
      description:
        '0 — оригинал; 1, 2, … — порядковый номер исправления в цепочке',
      icon: 'IconHistory',
      defaultValue: 0,
    },
  ],
});
