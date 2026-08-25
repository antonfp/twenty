import { defineObject, FieldType } from 'twenty-sdk/define';
import { DocStatus } from './sales-invoice.object';

export const PAYMENT_UNIVERSAL_IDENTIFIER =
  'd4e3fc58-2142-444f-9e5d-eb5656369786';

export const PAYMENT_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  'd611ee89-e7b9-46f8-8542-89bbba5dfe86';

export default defineObject({
  universalIdentifier: PAYMENT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'payment',
  namePlural: 'payments',
  labelSingular: 'Поступление оплаты',
  labelPlural: 'Поступления оплат',
  description: 'Поступление оплаты от покупателя',
  icon: 'IconCash',
  labelIdentifierFieldMetadataUniversalIdentifier:
    PAYMENT_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: PAYMENT_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: '2d872cdc-7119-4605-a41e-2b6efe1993d1',
      type: FieldType.TEXT,
      name: 'number',
      label: 'Номер',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'b2cb8d52-8e20-4029-9dc5-9e5b8dc3fd86',
      type: FieldType.DATE,
      name: 'paymentDate',
      label: 'Дата оплаты',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: '7f7cc955-2d17-407e-ad67-6866609806f0',
      type: FieldType.CURRENCY,
      name: 'amount',
      label: 'Сумма',
      icon: 'IconCurrencyRubel',
      isNullable: true,
    },
    {
      universalIdentifier: 'e5ed42a8-3982-429e-b64d-7f9c5a9785cc',
      type: FieldType.SELECT,
      name: 'docStatus',
      label: 'Статус',
      icon: 'IconProgressCheck',
      defaultValue: `'${DocStatus.DRAFT}'`,
      options: [
        {
          id: '66e92fed-a632-4829-84d0-77989166dc15',
          value: DocStatus.DRAFT,
          label: 'Черновик',
          position: 0,
          color: 'gray',
        },
        {
          id: '8e535ead-a6df-4318-bdf2-3bfc9ff32c9f',
          value: DocStatus.POSTED,
          label: 'Проведён',
          position: 1,
          color: 'green',
        },
        {
          id: '5fb707d0-1e95-4caf-943d-045818ceeaf2',
          value: DocStatus.CANCELLED,
          label: 'Отменён',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: 'e50d881e-6903-4a3f-a3c0-f3aa0c5842a0',
      type: FieldType.DATE,
      name: 'postingDate',
      label: 'Дата проведения',
      icon: 'IconCalendarEvent',
      isNullable: true,
    },
    {
      universalIdentifier: 'e866c685-ff6b-4360-af88-ffecda7b0520',
      type: FieldType.DATE_TIME,
      name: 'postedAt',
      label: 'Проведён в',
      icon: 'IconClock',
      isNullable: true,
    },
    {
      universalIdentifier: 'e068a399-c1df-4c8b-9181-c9304040f5d8',
      type: FieldType.DATE_TIME,
      name: 'cancelledAt',
      label: 'Отменён в',
      icon: 'IconBan',
      isNullable: true,
    },
    {
      universalIdentifier: '0ffc1814-d5e4-47bd-b60a-ab3ec159ce70',
      type: FieldType.TEXT,
      name: 'comment',
      label: 'Комментарий',
      icon: 'IconNotes',
      isNullable: true,
    },
  ],
});
