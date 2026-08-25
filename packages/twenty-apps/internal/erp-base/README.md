# ERPilot: Справочники (erp-base)

Базовый блок ERPilot: справочники + регистр взаиморасчётов. Зависимость для
`erp-sales` и `erp-purchases` — устанавливается первым, ничего не требует.

`universalIdentifier` приложения: `5de98d5e-9e03-43c3-9a68-6e2918d32613`
(новый, сгенерирован при разрезании Phase 3.5 Task 3; объекты и поля
унаследовали свои universalIdentifier от прежнего монолитного приложения
«ERPilot ERP», `d356931a-f402-4a7c-89d9-c8497bbe838e` — то приложение
удалено, серверные модули erp-sales/erp-purchases и e2e завязаны на
имена/uid объектов и полей, не на uid приложения).

## Структура (модули)

```
src/
  application-config.ts          # конфиг приложения, dependencies: []
  roles/                         # роль для post-install функции
  modules/
    directories/                 # модуль «Справочники»
      objects/  fields/  navigation-menu-items/  logic-functions/
    ledger/                      # регистр «Взаиморасчёты»
      objects/  fields/  navigation-menu-items/
```

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

## Модуль «Взаиморасчёты» (ledger)

- **Объект** `partyLedgerEntry` «Взаиморасчёты» — регистр (append-only, записи
  создаёт только сервер: `posting.service.ts` в `twenty-server`): документ-основание
  (тип/id), знаковая сумма (+ долг покупателя/поставщика, − оплата), дата, флаги
  «Сторнирована»/«Сторно-запись»; связи: `company` (стандартная), `organization`
  (из модуля «Справочники»).
- Общий для `erp-sales` и `erp-purchases` — обе зависимые записи в него пишутся
  сервером, отдельного регистра для закупок не заводится.
- **Навигация**: пункт «Взаиморасчёты» — top-level (без папки, `erp-base` не имеет
  своей папки «Продажи»/«Закупки»), position 13 — сразу после папок Справочники(10)/
  Продажи(11)/Закупки(12), когда установлены все три блока.

## Кто ссылается на объекты erp-base

`erp-sales` и `erp-purchases` объявляют `dependencies: ['5de98d5e-...']` и
добавляют RELATION-поля на `organization`/`item` (например
`organization.salesInvoices`, `item.supplierInvoiceLines`) — это ожидаемо и
проверено сервером (Phase 3.5 Task 2: видимость объектов зависимости при sync).
universalIdentifier'ы `organization`/`item` захардкожены в
`erp-sales/src/shared/erp-base-references.ts` и
`erp-purchases/src/shared/erp-base-references.ts` (cross-project TS-импорт
между приложениями невозможен — apps это отдельные SDK-проекты).

## Требования

- Node.js 24.5+, Yarn 4 (`packageManager: yarn@4.13.0`), сервер Twenty ≥ 2.30
  (проверялось на 2.34.4).
- **SDK-подключение: локальный `twenty-sdk`/`twenty-client-sdk` через `portal:`**
  (не npm 2.33.0!) — см. «Установка (CLI)» ниже и корневой
  `packages/twenty-apps/internal/README.md` за обоснованием (нужно для поля
  `dependencies` в erp-sales/erp-purchases; erp-base само зависимостей не
  объявляет, но держим SDK-подключение одинаковым во всех трёх проектах ради
  единообразия и совместимого билд-контракта манифеста).

## Установка (CLI)

```bash
cd packages/twenty-apps/internal/erp-base
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

Если команда падает с «Authentication failed» на API-ключе, выполните напрямую
через GraphQL `/metadata` с пользовательским access-токеном:

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
- UI: Settings → Applications → ERPilot: Справочники → Uninstall.
- **Нельзя удалить, пока установлен `erp-sales` или `erp-purchases`** (сервер
  отказывает с именами зависимых приложений, Phase 3.5 Task 2) — сначала
  удалите зависимые блоки.

Данные записей объектов приложения при удалении удаляются вместе с объектами — выгружайте
заранее, если нужны.

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
  контроль на уровне UI/логики.
- `engines.twenty: ">=2.30.0"` — версия сервера проверяется CLI и сервером; при апгрейде
  сервера мажорно обновите и пин twenty-sdk/twenty-client-sdk.
- Каждое приложение обязано иметь ровно один `defineApplicationRole()` (или
  `defaultRoleUniversalIdentifier` в конфиге) — требование SDK-манифест-билдера,
  даже без logic-функций (см. `erp-sales`/`erp-purchases`, у которых своя
  служебная роль без активных функций, «про запас»).
