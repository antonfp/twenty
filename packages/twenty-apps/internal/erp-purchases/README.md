# ERPilot: Закупки (erp-purchases)

Блок закупок ERPilot: счета поставщиков, оплаты поставщикам. **Зависит от
`erp-base`** — установите `erp-base` первым, иначе `apply`/установка
откажет с ошибкой `APP_NOT_INSTALLED`.

`universalIdentifier` приложения: `c8b7a31b-ed73-4b8b-ad1e-a8f6b7ae51f1`
(новый, сгенерирован при разрезании Phase 3.5 Task 3). Объекты/поля этого
блока унаследовали свои universalIdentifier от прежнего монолитного
приложения «ERPilot ERP» без изменений.

## dependencies

```ts
// src/application-config.ts
dependencies: ['5de98d5e-9e03-43c3-9a68-6e2918d32613'], // erp-base
```

`organization`/`item` — объекты `erp-base`; этот проект ссылается на них по
захардкоженному universalIdentifier в `src/shared/erp-base-references.ts`
(apps — отдельные SDK-проекты, cross-project TS-импорт между ними невозможен;
эти значения ДОЛЖНЫ совпадать с `erp-base/src/modules/directories/objects/
{organization,item}.object.ts`).

## Структура

```
src/
  application-config.ts          # конфиг приложения, dependencies: [erp-base uid]
  roles/                         # служебная роль (без активных функций сейчас)
  shared/erp-base-references.ts  # захардкоженные uid объектов erp-base
  modules/
    purchases/
      objects/  fields/  navigation-menu-items/
```

## Модуль «Закупки» (purchases)

- **Объекты**:
  - `supplierInvoice` «Счета поставщиков» — номер, дата счёта, статус документа
    (Черновик/Проведён/Отменён), дата проведения, `postedAt`/`cancelledAt`,
    итого, в т.ч. НДС, статус оплаты (Не оплачен/Частично оплачен/Оплачен),
    оплачено, комментарий; связи: `organization` (erp-base), `supplier`
    (стандартная Компания);
  - `supplierInvoiceLine` «Строки счетов поставщиков» — наименование позиции,
    кол-во, цена, ставка НДС, сумма (с НДС); связи: `supplierInvoice`
    (**CASCADE**), `item` (erp-base);
  - `supplierPayment` «Оплаты поставщикам» — номер, дата оплаты, сумма, статус
    документа, дата проведения, `postedAt`/`cancelledAt`, комментарий; связи:
    `organization` (erp-base), `supplier` (Компания), `supplierInvoice`.
- **Взаиморасчёты**: регистр `partyLedgerEntry` живёт в `erp-base` (общий с
  `erp-sales`) — сервер (`posting.service.ts`) пишет туда записи при
  проведении `supplierInvoice`/`supplierPayment`; отдельный регистр для
  закупок не заводится.
- **Контракт ядра проведения**: та же схема, что в «Продажах» — join-колонка
  `supplierInvoiceLine.supplierInvoice` РОВНО `supplierInvoiceId`,
  `onDelete: CASCADE`. Не переименовывать (на это завязан `erp-purchases`
  серверный модуль в `twenty-server`).
- **Навигация**: папка «Закупки» (position 12) с пунктами
  Счета поставщиков / Оплаты поставщикам.

## Требования

- Node.js 24.5+, Yarn 4 (`packageManager: yarn@4.13.0`), сервер Twenty ≥ 2.30.
- **SDK-подключение: локальный `twenty-sdk`/`twenty-client-sdk` через `portal:`,
  не npm 2.33.0** — см. корневой `packages/twenty-apps/internal/README.md` и
  `erp-sales/README.md` за полным обоснованием (тот же контракт, та же
  проверка фактом сборки).

```json
// package.json
"resolutions": {
  "twenty-client-sdk": "portal:../../../twenty-client-sdk"
},
"devDependencies": {
  "twenty-client-sdk": "portal:../../../twenty-client-sdk",
  "twenty-sdk": "portal:../../../twenty-sdk"
}
```

Запускать `twenty` CLI под arm64 Node: `volta run --node 24.5.0 --yarn 4.13.0
-- yarn twenty ...` (под системным x64 Node падает в `sharp`, резолвящийся из
корневого `node_modules` монорепы).

## Установка (CLI)

```bash
cd packages/twenty-apps/internal/erp-purchases
yarn install
volta run --node 24.5.0 --yarn 4.13.0 -- yarn twenty dev:build

yarn twenty remote:add --url http://localhost:3000 --api-key <API_KEY>

volta run --node 24.5.0 --yarn 4.13.0 -- yarn twenty plan
volta run --node 24.5.0 --yarn 4.13.0 -- yarn twenty apply   # erp-base должен быть уже установлен
```

## Удаление

- CLI: `yarn twenty app:uninstall` из каталога приложения.
- Установка/удаление отдельно от `erp-base` разрешена в обе стороны — можно
  снять `erp-purchases`, оставив `erp-base` и `erp-sales`.

Данные записей объектов приложения при удалении удаляются вместе с объектами.
