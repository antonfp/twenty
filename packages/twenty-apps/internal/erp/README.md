# ERPilot ERP (erp)

Модульное ERP-приложение ERPilot для Twenty на Twenty SDK: справочники + продажи + закупки.

## Структура (модули)

Платформенное ограничение: приложение Twenty **не может ссылаться на объекты другого
приложения**, поэтому все блоки ERPilot живут в одном app — «один app, модули внутри —
до появления межприложенческих зависимостей». Модули — это слайсы внутри `src/modules/`
(по образцу `internal/twenty-partners`):

```
src/
  application-config.ts          # конфиг приложения (universalIdentifier неизменен)
  roles/                         # роль для logic-функций (общая для app)
  modules/
    directories/                 # модуль «Справочники»
      objects/  fields/  navigation-menu-items/  logic-functions/
    sales/                       # модуль «Продажи»
      objects/  fields/  navigation-menu-items/
    purchases/                   # модуль «Закупки»
      objects/  fields/  navigation-menu-items/
```

Ранее приложение называлось `erp-directories` («ERPilot Справочники») и содержало только
справочники; переименовано в `@erpilot/erp` с сохранением `universalIdentifier`
приложения и всех сущностей — установленный app обновляется на месте, без пересоздания.

## Модуль «Справочники» (directories)

- **Объекты** (RU-лейблы, латинские имена в metadata):
  - `organization` «Организации» — своя фирма-продавец: реквизиты (ИНН/КПП/ОГРН),
    система налогообложения (SELECT: ОСНО / УСН доходы / УСН доходы-расходы / Патент),
    банк, подписанты, признак «Основная»;
  - `item` «Номенклатура» — товары и услуги: тип (Товар/Услуга, по умолчанию Услуга),
    артикул, ед. изм. (шт/усл/ч/день/мес/кг/м/м²/компл), ставка НДС (20/10/0/Без НДС,
    по умолчанию 20%), цена продажи (CURRENCY), описание;
  - `warehouse` «Склады» — название, адрес, признак «Основной»;
  - `priceType` «Виды цен» — название, «Цена включает НДС» (по умолчанию да);
  - `itemPrice` «Цены номенклатуры» — связи на номенклатуру и вид цен, цена, «Действует с».
- **Расширение стандартной Компании** (контрагент): ИНН, КПП, ОГРН, юридический адрес,
  банк, БИК, расчётный счёт, роли «Покупатель»/«Поставщик».
- **Навигация**: папка «Справочники» с пятью пунктами-объектами.
- **Seed при установке** (post-install функция): вид цен «Розничная» (includesVat=true)
  и склад «Основной склад» (isDefault=true). Организация намеренно не сидится —
  первый шаг настройки блока: «заполните реквизиты организации».

## Модуль «Продажи» (sales)

- **Объекты**:
  - `salesInvoice` «Счета покупателям» — номер, дата счёта, статус документа
    (Черновик/Проведён/Отменён), дата проведения, `postedAt`/`cancelledAt`,
    итого, в т.ч. НДС, статус оплаты (Не оплачен/Частично оплачен/Оплачен),
    оплачено, комментарий; связи: `organization`, `customer` (стандартная Компания).
    `name` заполняется сервером при проведении («Счёт № 7 от 25.08.2026»);
  - `salesInvoiceLine` «Строки счёта» — наименование позиции, кол-во, цена,
    ставка НДС, сумма (с НДС); связи: `salesInvoice` (**CASCADE**), `item`;
  - `payment` «Поступления оплат» — номер, дата оплаты, сумма, статус документа,
    дата проведения, `postedAt`/`cancelledAt`, комментарий; связи: `organization`,
    `payer` (Компания), `salesInvoice`;
  - `partyLedgerEntry` «Взаиморасчёты» — **регистр** (append-only, записи создаёт
    только сервер): документ-основание (тип/id), знаковая сумма (+ долг покупателя,
    − оплата), дата, флаги «Сторнирована»/«Сторно-запись»; связи: `company`,
    `organization`.
- **Контракт ядра проведения**: строки документа `${objectName}` живут в объекте
  `${objectName}Line` с join-колонкой `${objectName}Id` — поэтому
  `salesInvoiceLine.salesInvoice` имеет `joinColumnName: 'salesInvoiceId'`
  и `onDelete: CASCADE`. Не переименовывать.
- **Навигация**: папка «Продажи» (после «Справочников») с пунктами
  Счета покупателям / Поступления оплат / Взаиморасчёты.

## Модуль «Закупки» (purchases)

- **Объекты**:
  - `supplierInvoice` «Счета поставщиков» — номер, дата счёта, статус документа
    (Черновик/Проведён/Отменён), дата проведения, `postedAt`/`cancelledAt`,
    итого, в т.ч. НДС, статус оплаты (Не оплачен/Частично оплачен/Оплачен),
    оплачено, комментарий; связи: `organization`, `supplier` (стандартная Компания);
  - `supplierInvoiceLine` «Строки счетов поставщиков» — наименование позиции, кол-во,
    цена, ставка НДС, сумма (с НДС); связи: `supplierInvoice` (**CASCADE**), `item`;
  - `supplierPayment` «Оплаты поставщикам» — номер, дата оплаты, сумма, статус документа,
    дата проведения, `postedAt`/`cancelledAt`, комментарий; связи: `organization`,
    `supplier` (Компания), `supplierInvoice`.
- **Контракт ядра проведения**: та же схема, что в «Продажах» — join-колонка
  `supplierInvoiceLine.supplierInvoice` РОВНО `supplierInvoiceId`, `onDelete: CASCADE`.
- **Навигация**: папка «Закупки» (после «Продаж», position 12) с пунктами
  Счета поставщиков / Оплаты поставщикам.
- Регистр взаиморасчётов отдельный для закупок не заводится — используется общий
  `partyLedgerEntry` из модуля «Продажи».

## Требования

- Node.js 24.5+, Yarn 4 (`packageManager: yarn@4.13.0`), сервер Twenty ≥ 2.30
  (проверялось на 2.34.4).
- Зависимости `twenty-sdk` / `twenty-client-sdk` закреплены на **2.33.0** — ближайшая
  опубликованная в npm версия к серверу 2.34.4 (в npm нет 2.34.x, а 2.35.0 новее
  сервера). Локальный `packages/twenty-sdk` (2.34.0) через `file:` не подключить:
  у него зависимость `twenty-client-sdk: workspace:*`, вне монорепы она не резолвится.

## Установка (CLI)

```bash
cd packages/twenty-apps/internal/erp
yarn install
yarn twenty dev:build                      # сборка манифеста + typecheck

# подключение к серверу по API-ключу (не интерактивно):
yarn twenty remote:add --url http://localhost:3000 --api-key <API_KEY>

yarn twenty plan                           # предпросмотр изменений
yarn twenty apply                          # применить (установить/обновить приложение)
```

API-ключ создаётся в UI: Settings → APIs, либо через GraphQL `/metadata`:
`createApiKey(input: {name, expiresAt, roleId})` → `generateApiKeyToken(apiKeyId, expiresAt)`
(roleId — роль с `canBeAssignedToApiKeys: true`, обычно Admin; список — query `getRoles`).

### Важно: seed при dev-синке

`twenty apply` / `twenty dev` синкают манифест, но **не запускают** post-install
функцию — она выполняется при «настоящей» установке (marketplace / pre-installed /
`app:install`). После первого `apply` выполните её вручную:

```bash
yarn twenty dev:function:exec --postInstall
```

Если команда падает с «Authentication failed» на API-ключе (наблюдалось с CLI 2.33.0
против сервера 2.34.4), выполните напрямую через GraphQL `/metadata` с пользовательским
access-токеном:

```graphql
query { findManyLogicFunctions { id name universalIdentifier } }
mutation {
  executeOneLogicFunction(input: { id: "<id функции post-install>", payload: {} }) {
    status logs error
  }
}
```

Функция не идемпотентна: повторный запуск создаст дубликаты «Розничная» / «Основной склад».

## Удаление

- CLI: `yarn twenty app:uninstall` из каталога приложения (флаг `-y` — без подтверждения).
- UI: Settings → Applications → ERPilot ERP → Uninstall.

Данные записей объектов приложения при удалении удаляются вместе с объектами — выгружайте
заранее, если нужны.

## Как сделать блок предустановленным для всех workspace

1. В admin-panel (пользователь с правами Admin Panel): Applications → регистрация
   «ERPilot ERP» → включить флаг **isPreInstalled** (GraphQL:
   `updateApplicationRegistration(input: {id: "<registrationId>", update: {isPreInstalled: true}})`).
2. Новые workspace получат приложение автоматически при провижининге.
3. Для уже существующих workspace — backfill-команда на сервере (идемпотентна):

```bash
npx nx run twenty-server:command install-pre-installed-apps
# предпросмотр: ... install-pre-installed-apps --dry-run
```

## Замечания и грабли

- **`address` — зарезервированное имя** метаданных Twenty, поэтому поле адреса склада
  называется `warehouseAddress` (лейбл «Адрес»). Полный список — 
  `twenty-shared/src/metadata/constants/reserved-metadata-name-keywords.constant.ts`.
- INDEX-вью и страницы записей движок создаёт сам при создании объекта — в приложении
  они сознательно не описаны, только навигация.
- Русские лейблы — обычные строки в манифесте (`isLabelSyncedWithName=false`
  проставляют конвертеры движка); имена объектов/полей — латиница camelCase.
- Двусторонние RELATION-поля (`itemPrice.item` ↔ `item.itemPrices`,
  `itemPrice.priceType` ↔ `priceType.itemPrices`) описаны парами файлов в `fields/` модуля
  по образцу `internal/real-estate` (buyer-* поля); у MANY_TO_ONE-стороны задаётся
  `joinColumnName` и `onDelete` (item — CASCADE, priceType — SET_NULL).
- `universalIdentifier` всех сущностей должны оставаться стабильными между версиями —
  SDK отслеживает сущности по ним, смена UUID = пересоздание объекта с потерей данных.
- Уникальность itemPrice по item×priceType×validFrom в MVP не форсится индексом —
  контроль на уровне UI/логики (см. spec).
- `engines.twenty: ">=2.30.0"` — версия сервера проверяется CLI и сервером; при апгрейде
  сервера мажорно обновите и пин twenty-sdk/twenty-client-sdk.
