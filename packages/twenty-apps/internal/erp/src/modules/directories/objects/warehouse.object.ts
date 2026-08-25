import { defineObject, FieldType } from 'twenty-sdk/define';

export const WAREHOUSE_UNIVERSAL_IDENTIFIER =
  '18deb778-96ab-4c49-bad5-f9136cc503a2';

export const WAREHOUSE_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  'c048b062-574f-40ff-b604-a10293f26d5d';

export default defineObject({
  universalIdentifier: WAREHOUSE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'warehouse',
  namePlural: 'warehouses',
  labelSingular: 'Склад',
  labelPlural: 'Склады',
  description: 'Места хранения товаров',
  icon: 'IconBuildingWarehouse',
  labelIdentifierFieldMetadataUniversalIdentifier:
    WAREHOUSE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: WAREHOUSE_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Наименование',
      icon: 'IconAbc',
    },
    {
      // 'address' — зарезервированное имя метаданных в Twenty, поэтому warehouseAddress
      universalIdentifier: 'dc7ff224-a34b-45cf-ad3c-52d1e7411f4a',
      type: FieldType.TEXT,
      name: 'warehouseAddress',
      label: 'Адрес',
      icon: 'IconMapPin',
      isNullable: true,
    },
    {
      universalIdentifier: 'ab617b47-8ffb-44c0-8979-2a8d273701c6',
      type: FieldType.BOOLEAN,
      name: 'isDefault',
      label: 'Основной',
      description: 'Подставляется в документы по умолчанию',
      icon: 'IconStar',
      defaultValue: false,
    },
  ],
});
