# ERPilot: Бухгалтерия (erp-accounting)

Блок бухгалтерии ERPilot: план счетов, ручные операции и регистр проводок
(РСБУ). **Зависит от `erp-base`, `erp-sales`, `erp-purchases` и
`erp-stock`** — установите их первыми, иначе `apply`/установка откажет с
ошибкой `APP_NOT_INSTALLED`.

`universalIdentifier` приложения: `1de9d48b-4bdf-4301-b1a0-51b09452c017`
(новый, сгенерирован для Фазы 6).

## dependencies

```ts
// src/application-config.ts
dependencies: [
  '5de98d5e-9e03-43c3-9a68-6e2918d32613', // erp-base
  '4c1b056f-b6d2-4cde-a3a1-2faffd48ac6b', // erp-sales
  'c8b7a31b-ed73-4b8b-ad1e-a8f6b7ae51f1', // erp-purchases
  'b449d3c2-d699-4437-85f1-70670094f5c9', // erp-stock
],
```

`organization`/`item` — объекты `erp-base`; `company` — STANDARD-объект
платформы (не зависит от erp-*). Этот проект ссылается на них по
захардкоженному universalIdentifier в `src/shared/erp-references.ts` (apps —
отдельные SDK-проекты, cross-project TS-импорт между ними невозможен; эти
значения ДОЛЖНЫ совпадать с исходными объектами в соседних проектах — см.
комментарий в файле). Зависимости на `erp-sales`/`erp-purchases`/`erp-stock`
объявлены для будущей серверной логики проведения документов-оснований
(Task 2) — Task 1 (объекты) их не использует.

## Структура

```
src/
  application-config.ts          # конфиг приложения, dependencies: [erp-base, erp-sales, erp-purchases, erp-stock]
  roles/                         # служебная роль
  shared/erp-references.ts       # захардкоженные uid объектов erp-base
  modules/
    accounting/
      objects/  fields/  navigation-menu-items/  logic-functions/
```

## Модуль «Бухгалтерия» (accounting)

- **`account`** «Счёт учёта» / «План счетов» (`IconListNumbers`) — `code`
  (labelIdentifier, уникальность проверяет post-install seed), `name`,
  `kind` (Активный/Пассивный/Активно-пассивный), `comment`.
- **`manualEntry`** «Ручная операция» / «Ручные операции»
  (`IconPencilPlus`) — стандартный набор документа (`name`/`number`/
  `docStatus` (Черновик/Проведён/Отменён)/`postingDate`/`postedAt`/
  `cancelledAt`, один в один как у `goodsWriteOff`), `comment`; связь:
  `organization` (`erp-base`, `SET_NULL`). Нумерация — `ME-<n>`.
- **`manualEntryLine`** «Строка ручной операции» — `name` (labelIdentifier),
  `amount`; связи: `manualEntry` (**CASCADE**, `manualEntryId`),
  `debitAccount`/`creditAccount` (оба → `account`, `SET_NULL`,
  `debitAccountId`/`creditAccountId`), `party` (→ `company`, опционально,
  `SET_NULL`), `item` (→ `erp-base.item`, опционально, `SET_NULL`).
- **Регистр `glEntry`** «Проводка» / «Проводки» (`IconBook2`, append-only,
  записи создаёт только сервер) — `name` (labelIdentifier), `date`,
  `amount`, `voucherType`/`voucherId` (документ-основание),
  `isCancelled`/`isCancellation`; связи: `debitAccount`/`creditAccount`
  (→ `account`), `organization` (→ `erp-base`), `party` (→ `company`,
  опционально), `item` (→ `erp-base.item`, опционально).
- **post-install**: заполняет рабочий план счетов РСБУ — 30 счетов/субсчетов
  (01…99), идемпотентно по `code`.
- **Навигация**: папка «Бухгалтерия» (position 15) с пунктами План счетов /
  Ручные операции / Проводки.

## erp-base: `organization.lockDate`

Task 1 также добавляет полю `organization` (объект `erp-base`) новое поле
`lockDate` «Дата запрета изменений» (`DATE`, опционально) — период до этой
даты закрыт для изменений документов; проверка — в серверной логике
проведения (`erp-accounting` Task 2), не на уровне платформы. **Применять
`erp-base` ПЕРЕД `erp-accounting`** — иначе на `apply` не будет поля, на
которое можно сослаться при доработке проведения.

## Требования

- Node.js 24.5+, Yarn 4 (`packageManager: yarn@4.13.0`), сервер Twenty ≥ 2.30.
- **SDK-подключение: локальный `twenty-sdk`/`twenty-client-sdk` через `portal:`,
  не npm** — см. `packages/twenty-apps/internal/README.md` и
  `erp-stock/README.md` за полным обоснованием (тот же контракт —
  `dependencies` в `defineApplication()` — та же проверка фактом сборки).

Запускать `twenty` CLI под arm64 Node: `volta run --node 24.5.0 --yarn 4.13.0
-- yarn twenty ...` (под системным x64 Node падает в `sharp`, резолвящийся из
корневого `node_modules` монорепы).

## Установка (CLI)

```bash
cd packages/twenty-apps/internal/erp-accounting
yarn install
volta run --node 24.5.0 --yarn 4.13.0 -- yarn twenty dev:build

# remote "localhost" уже сконфигурирован в ~/.twenty/config.json
volta run --node 24.5.0 --yarn 4.13.0 -- yarn twenty -r localhost plan
volta run --node 24.5.0 --yarn 4.13.0 -- yarn twenty -r localhost apply   # erp-base/erp-sales/erp-purchases/erp-stock должны быть уже установлены
```

## Удаление

- CLI: `yarn twenty app:uninstall` из каталога приложения.
- Требует снятия зависимости: пока `erp-accounting` установлен, его
  зависимости снять нельзя (платформа проверяет обратные зависимости).

Данные записей объектов приложения при удалении удаляются вместе с объектами.
