# ERPilot: Продажи (erp-sales)

Блок продаж ERPilot: счета покупателям, поступления оплат. **Зависит от
`erp-base`** — установите `erp-base` первым, иначе `apply`/установка
откажет с ошибкой `APP_NOT_INSTALLED`.

`universalIdentifier` приложения: `4c1b056f-b6d2-4cde-a3a1-2faffd48ac6b`
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
    sales/
      objects/  fields/  navigation-menu-items/
```

## Модуль «Продажи» (sales)

- **Объекты**:
  - `salesInvoice` «Счета покупателям» — номер, дата счёта, статус документа
    (Черновик/Проведён/Отменён), дата проведения, `postedAt`/`cancelledAt`,
    итого, в т.ч. НДС, статус оплаты (Не оплачен/Частично оплачен/Оплачен),
    оплачено, комментарий; связи: `organization` (erp-base), `customer`
    (стандартная Компания). `name` заполняется сервером при проведении
    («Счёт № 7 от 25.08.2026»);
  - `salesInvoiceLine` «Строки счёта» — наименование позиции, кол-во, цена,
    ставка НДС, сумма (с НДС); связи: `salesInvoice` (**CASCADE**), `item` (erp-base);
  - `payment` «Поступления оплат» — номер, дата оплаты, сумма, статус документа,
    дата проведения, `postedAt`/`cancelledAt`, комментарий; связи: `organization`
    (erp-base), `payer` (Компания), `salesInvoice`.
- **Взаиморасчёты**: регистр `partyLedgerEntry` живёт в `erp-base` (общий с
  `erp-purchases`) — сервер (`posting.service.ts`) пишет туда записи при
  проведении `salesInvoice`/`payment`; этот блок не описывает пункт
  «Взаиморасчёты» в своей навигации.
- **Контракт ядра проведения**: строки документа `${objectName}` живут в объекте
  `${objectName}Line` с join-колонкой `${objectName}Id` — поэтому
  `salesInvoiceLine.salesInvoice` имеет `joinColumnName: 'salesInvoiceId'`
  и `onDelete: CASCADE`. Не переименовывать (на это завязан `erp-sales`
  серверный модуль в `twenty-server`).
- **Навигация**: папка «Продажи» (position 11) с пунктами
  Счета покупателям / Поступления оплат.

## Требования

- Node.js 24.5+, Yarn 4 (`packageManager: yarn@4.13.0`), сервер Twenty ≥ 2.30.
- **SDK-подключение: локальный `twenty-sdk`/`twenty-client-sdk` через `portal:`,
  не npm 2.33.0** — см. корневой `packages/twenty-apps/internal/README.md`
  за полным обоснованием. Кратко: опубликованный в npm `twenty-sdk@2.33.0` не
  знает про поле `dependencies` в `defineApplication()` (тип `ApplicationConfig`
  его не содержит) — typecheck манифест-билдера падает на
  `application-config.ts`. Проверено фактом сборки: с npm 2.33.0 —
  `Object literal may only specify known properties, and 'dependencies' does
  not exist in type 'ApplicationConfig'`; после переключения на портал в
  локальный `packages/twenty-sdk` — манифест собирается и `application.
  dependencies` присутствует в `.twenty/output/manifest.json`.

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

Локальный `twenty-sdk` объявляет `twenty-client-sdk: workspace:*` — вне
монорепы `workspace:*` не резолвится ни через `file:`, ни через голый
`portal:` (Yarn пытается разрешить транзитивную зависимость портала как член
воркспейса и падает: `Workspace not found`). Резолвится через
`resolutions.twenty-client-sdk`, форсирующий и прямую, и транзитивную
зависимость на тот же локальный портал.

Запускать `twenty` CLI нужно под arm64 Node (`volta run --node 24.5.0
--yarn 4.13.0 -- yarn twenty ...`) — под системным x64 Node сборка падает в
`sharp` (`Could not load the "sharp" module using the darwin-x64 runtime`),
т.к. портал резолвит `sharp` из корневого `node_modules` монорепы, собранного
под arm64.

## Установка (CLI)

```bash
cd packages/twenty-apps/internal/erp-sales
yarn install
volta run --node 24.5.0 --yarn 4.13.0 -- yarn twenty dev:build

yarn twenty remote:add --url http://localhost:3000 --api-key <API_KEY>

volta run --node 24.5.0 --yarn 4.13.0 -- yarn twenty plan
volta run --node 24.5.0 --yarn 4.13.0 -- yarn twenty apply   # erp-base должен быть уже установлен
```

## Удаление

- CLI: `yarn twenty app:uninstall` из каталога приложения.
- Установка/удаление отдельно от `erp-base` разрешена в обе стороны — можно
  снять `erp-sales`, оставив `erp-base` и `erp-purchases`.

Данные записей объектов приложения при удалении удаляются вместе с объектами.
