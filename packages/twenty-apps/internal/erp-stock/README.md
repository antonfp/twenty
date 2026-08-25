# ERPilot: Склад (erp-stock)

Блок склада ERPilot: поступления, реализации (складская часть), перемещения,
списания, оприходования, регистр движений и остатков со скользящей средней
себестоимостью. **Зависит от `erp-base`, `erp-sales` и `erp-purchases`** —
установите их первыми, иначе `apply`/установка откажет с ошибкой
`APP_NOT_INSTALLED`.

`universalIdentifier` приложения: `b449d3c2-d699-4437-85f1-70670094f5c9`
(новый, сгенерирован для Фазы 5).

## dependencies

```ts
// src/application-config.ts
dependencies: [
  '5de98d5e-9e03-43c3-9a68-6e2918d32613', // erp-base
  '4c1b056f-b6d2-4cde-a3a1-2faffd48ac6b', // erp-sales
  'c8b7a31b-ed73-4b8b-ad1e-a8f6b7ae51f1', // erp-purchases
],
```

`organization`/`item`/`warehouse` — объекты `erp-base`; `salesInvoice` —
объект `erp-sales`; `supplierInvoice` — объект `erp-purchases`. Этот проект
ссылается на них по захардкоженному universalIdentifier в
`src/shared/erp-references.ts` (apps — отдельные SDK-проекты, cross-project
TS-импорт между ними невозможен; эти значения ДОЛЖНЫ совпадать с исходными
объектами в соседних проектах — см. комментарий в файле).

## Ponytail-ruling: почему один app, а не erp-stock-core + glue

Честная резка на независимые куски выглядела бы так: `erp-stock-core`
(объекты, не знающие о продажах/закупках — поступления/перемещения/
списания/оприходования/регистры) + отдельный `erp-stock-sales-glue`-модуль
(только `salesShipment`/`salesShipmentLine` + связь на `salesInvoice`).
Складской учёт валиден и без блока продаж — приход/перемещение/списание не
требуют `erp-sales`.

Не сделано: цена лишнего app-проекта (ещё один `package.json` + portal-SDK +
CLI-цикл `dev:build`/`apply`) выше, чем цена связности, пока нет реального
кейса «склад без продаж» — сейчас **все** потребители ERPilot ставят
`erp-sales`/`erp-purchases` вместе со складом (реализация физически не
существует без счёта покупателю). Один app с
`dependencies: [erp-base, erp-sales, erp-purchases]` — самый короткий путь,
который проходит те же guard'ы платформы (Фаза 3.5 admits множественные
dependencies). Апгрейд: как только появится инсталляция без `erp-sales`,
вынести `salesShipment`/`salesShipmentLine` (и их relation-поля на
`salesInvoice`) в отдельный `erp-stock-sales-glue` app, оставив
`erp-stock-core` зависимым только от `erp-base`+`erp-purchases`.

## Структура

```
src/
  application-config.ts          # конфиг приложения, dependencies: [erp-base, erp-sales, erp-purchases]
  roles/                         # служебная роль (без активных функций сейчас)
  shared/erp-references.ts       # захардкоженные uid объектов erp-base/erp-sales/erp-purchases
  modules/
    stock/
      objects/  fields/  navigation-menu-items/
```

## Модуль «Склад» (stock)

- **Документы** (стандартный набор полей — `name`/`number`/`docStatus`
  (Черновик/Проведён/Отменён)/`postingDate`/`postedAt`/`cancelledAt` — один
  в один как у `supplierInvoice`):
  - `goodsReceipt` «Поступления товаров» — + `total` (себестоимость прихода),
    `comment`; связи: `organization`, `supplier` (Компания), `supplierInvoice`
    (опционально, `SET_NULL`), `warehouse`;
  - `goodsReceiptLine` «Строки поступлений товаров» — наименование, кол-во,
    цена (себестоимость), сумма; связи: `goodsReceipt` (**CASCADE**), `item`;
  - `salesShipment` «Реализации товаров» — + `totalCost` (себестоимость
    списания, заполняется проведением), `comment`; связи: `organization`,
    `customer` (Компания), `salesInvoice` (`SET_NULL`), `warehouse`;
  - `salesShipmentLine` «Строки реализаций товаров» — наименование, кол-во,
    цена продажи, сумма (с НДС), ставка НДС, себестоимость (заполняется
    проведением); связи: `salesShipment` (**CASCADE**), `item`;
  - `stockTransfer` «Перемещения товаров» — связи: `organization`,
    `warehouseFrom`/`warehouseTo` (оба — `warehouse`, разные join-колонки);
  - `stockTransferLine` «Строки перемещений товаров» — наименование, кол-во;
    связи: `stockTransfer` (**CASCADE**), `item`;
  - `goodsWriteOff` «Списания товаров» — связи: `organization`, `warehouse`;
  - `goodsWriteOffLine` «Строки списаний товаров» — наименование, кол-во,
    причина (текст); связи: `goodsWriteOff` (**CASCADE**), `item`;
  - `goodsPosting` «Оприходования товаров» — связи: `organization`,
    `warehouse`;
  - `goodsPostingLine` «Строки оприходований товаров» — наименование, кол-во,
    себестоимость, сумма; связи: `goodsPosting` (**CASCADE**), `item`.
- **Регистры** (append-only, записи создаёт только сервер — guard'ы
  добавляет Task 2):
  - `stockLedgerEntry` «Движения товаров» — `actualQty` (знаковое),
    `qtyAfter`, `valuationRate`, `stockValueDiff` (знаковая),
    `voucherType`/`voucherId`, `isCancelled`/`isCancellation`; связи: `item`,
    `warehouse`, `organization`;
  - `itemBalance` «Остатки товаров» — `item` × `warehouse`, `actualQty`,
    `avgCost`.
- **Контракт ядра проведения**: строки документа `${objectName}` живут в
  объекте `${objectName}Line` с join-колонкой `${objectName}Id` —
  `goodsReceiptId`/`salesShipmentId`/`stockTransferId`/`goodsWriteOffId`/
  `goodsPostingId`, все `onDelete: CASCADE`. Не переименовывать (на это
  завязан серверный модуль `erp-stock` в `twenty-server`, Task 2).
- **Навигация**: папка «Склад» (position 14) с пунктами Поступления /
  Реализации / Перемещения / Списания / Оприходования / Остатки товаров /
  Движения товаров.

## Требования

- Node.js 24.5+, Yarn 4 (`packageManager: yarn@4.13.0`), сервер Twenty ≥ 2.30.
- **SDK-подключение: локальный `twenty-sdk`/`twenty-client-sdk` через `portal:`,
  не npm 2.33.0** — см. корневой `packages/twenty-apps/internal/README.md` и
  `erp-purchases/README.md`/`erp-sales/README.md` за полным обоснованием (тот
  же контракт — `dependencies` в `defineApplication()` — та же проверка
  фактом сборки).

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
cd packages/twenty-apps/internal/erp-stock
yarn install
volta run --node 24.5.0 --yarn 4.13.0 -- yarn twenty dev:build

# remote "localhost" уже сконфигурирован в ~/.twenty/config.json
volta run --node 24.5.0 --yarn 4.13.0 -- yarn twenty -r localhost plan
volta run --node 24.5.0 --yarn 4.13.0 -- yarn twenty -r localhost apply   # erp-base/erp-sales/erp-purchases должны быть уже установлены
```

## Удаление

- CLI: `yarn twenty app:uninstall` из каталога приложения.
- Требует снятия зависимости: пока `erp-stock` установлен, `erp-base`/
  `erp-sales`/`erp-purchases` снять нельзя (платформа проверяет обратные
  зависимости).

Данные записей объектов приложения при удалении удаляются вместе с объектами.
