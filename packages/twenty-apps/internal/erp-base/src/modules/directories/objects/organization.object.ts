import { defineObject, FieldType } from 'twenty-sdk/define';

enum TaxSystem {
  OSNO = 'OSNO',
  USN_INCOME = 'USN_INCOME',
  USN_INCOME_EXPENSE = 'USN_INCOME_EXPENSE',
  PATENT = 'PATENT',
}

export const ORGANIZATION_UNIVERSAL_IDENTIFIER =
  'c702b6c3-afeb-4355-803b-e223acbe0205';

export const ORGANIZATION_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  '522fafc0-1497-4c37-bde1-df3009d919e6';

export default defineObject({
  universalIdentifier: ORGANIZATION_UNIVERSAL_IDENTIFIER,
  nameSingular: 'organization',
  namePlural: 'organizations',
  labelSingular: 'Организация',
  labelPlural: 'Организации',
  description: 'Своя фирма-продавец (реквизиты для документов)',
  icon: 'IconBuildingBank',
  labelIdentifierFieldMetadataUniversalIdentifier:
    ORGANIZATION_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: ORGANIZATION_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      description: 'Краткое наименование, например «ООО Ромашка»',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: 'b1ed27d3-225d-46e9-8b37-70d9594a3ac6',
      type: FieldType.TEXT,
      name: 'fullName',
      label: 'Полное наименование',
      icon: 'IconFileText',
      isNullable: true,
    },
    {
      universalIdentifier: '87e2d069-e9b1-48a6-9267-cad3a8858e9f',
      type: FieldType.TEXT,
      name: 'inn',
      label: 'ИНН',
      description: '10 цифр для юрлица, 12 для ИП',
      icon: 'IconId',
      isNullable: true,
    },
    {
      universalIdentifier: '6fb48aff-ed56-47bf-a079-9752a3549dfb',
      type: FieldType.TEXT,
      name: 'kpp',
      label: 'КПП',
      description: 'Пусто для ИП',
      icon: 'IconId',
      isNullable: true,
    },
    {
      universalIdentifier: '20937f88-df20-4f43-a09a-ea97ecb70ed1',
      type: FieldType.TEXT,
      name: 'ogrn',
      label: 'ОГРН / ОГРНИП',
      icon: 'IconId',
      isNullable: true,
    },
    {
      universalIdentifier: '4b006404-1ce3-4276-88fb-a6dbfddd13b7',
      type: FieldType.TEXT,
      name: 'legalAddress',
      label: 'Юридический адрес',
      icon: 'IconMapPin',
      isNullable: true,
    },
    {
      universalIdentifier: 'edf4a0cf-86bf-4e28-8a0c-3882acfeea17',
      type: FieldType.SELECT,
      name: 'taxSystem',
      label: 'Система налогообложения',
      icon: 'IconPercentage',
      isNullable: true,
      options: [
        {
          id: 'b0fc7dfd-9a55-4dc4-8709-5cdceb3647f1',
          value: TaxSystem.OSNO,
          label: 'ОСНО',
          position: 0,
          color: 'blue',
        },
        {
          id: '362d64d6-71f0-4c28-b6d4-5ddf15926820',
          value: TaxSystem.USN_INCOME,
          label: 'УСН (доходы)',
          position: 1,
          color: 'green',
        },
        {
          id: '951f237f-377a-40b7-bda1-b65510461b64',
          value: TaxSystem.USN_INCOME_EXPENSE,
          label: 'УСН (доходы-расходы)',
          position: 2,
          color: 'turquoise',
        },
        {
          id: 'dfc33ea1-dec2-4b64-a458-b226644e60ff',
          value: TaxSystem.PATENT,
          label: 'Патент',
          position: 3,
          color: 'purple',
        },
      ],
    },
    {
      universalIdentifier: 'e540f512-48db-40b7-ad7a-060feac5b4d4',
      type: FieldType.TEXT,
      name: 'bankName',
      label: 'Банк',
      icon: 'IconBuildingBank',
      isNullable: true,
    },
    {
      universalIdentifier: '27c8440a-c0d7-4604-b8ad-2a06b5caca52',
      type: FieldType.TEXT,
      name: 'bik',
      label: 'БИК',
      icon: 'IconHash',
      isNullable: true,
    },
    {
      universalIdentifier: 'cbd59751-6bfc-42f9-b878-b54ad8a7be32',
      type: FieldType.TEXT,
      name: 'corrAccount',
      label: 'Корр. счёт',
      icon: 'IconNumbers',
      isNullable: true,
    },
    {
      universalIdentifier: '4e6b3654-4041-4072-b7bc-eef4d5a10cdb',
      type: FieldType.TEXT,
      name: 'settlementAccount',
      label: 'Расчётный счёт',
      icon: 'IconNumbers',
      isNullable: true,
    },
    {
      universalIdentifier: 'd8473df0-9e51-4c87-9288-8c6ce3937f16',
      type: FieldType.TEXT,
      name: 'directorName',
      label: 'Руководитель',
      description: 'Для подписи в печатных формах',
      icon: 'IconUser',
      isNullable: true,
    },
    {
      universalIdentifier: '9c38d249-9eee-4695-b428-577d136216ef',
      type: FieldType.TEXT,
      name: 'accountantName',
      label: 'Главный бухгалтер',
      icon: 'IconUser',
      isNullable: true,
    },
    {
      universalIdentifier: '5b3f65f3-f442-4516-bb2d-2010790fd237',
      type: FieldType.BOOLEAN,
      name: 'isDefault',
      label: 'Основная',
      description: 'Подставляется в документы по умолчанию',
      icon: 'IconStar',
      defaultValue: false,
    },
    {
      // Phase 6 Task 1 (erp-accounting): период до этой даты закрыт для
      // изменений документов — проверяется серверной логикой проведения
      // (erp-accounting Task 2), не платформой.
      universalIdentifier: 'ae50f0bc-2338-4f7c-844c-5bc29af690ff',
      type: FieldType.DATE,
      name: 'lockDate',
      label: 'Дата запрета изменений',
      description:
        'Документы с датой проведения не позже этой даты нельзя создавать/изменять/отменять',
      icon: 'IconLock',
      isNullable: true,
    },
  ],
});
