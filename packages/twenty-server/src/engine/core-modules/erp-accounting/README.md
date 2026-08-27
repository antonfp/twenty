# ERP block «Бухгалтерия» — server (erp-accounting)

Серверная часть блока бухгалтерии: GL-контрибьюторы, lock date, провайдер
`manualEntry`, ОСВ-отчёт, бухгалтерский баланс и ОФР (упрощённые формы, ФСБУ
4/2023 — `docs/erp-design/balance-spec.md`/`ofr-spec.md`), импорт банковских
выписок. Метаданные объектов ставит SDK-приложение
(`packages/twenty-apps/internal/erp-accounting`); этот модуль — только
код-сторона.

## Печатные отчёты

`GET /rest/erp/reports/trial-balance`, `/balance-sheet`, `/income-statement`
(+ MCP-тулы `trial_balance`/`balance_sheet`/`income_statement`) — все три
читают только регистр `glEntry`, требуют `canReadObjectRecords` на нём.
Баланс/ОФР — печать округляется до тыс. руб. банковским округлением, MCP
отдаёт копейки без округления (`balance-spec.md §5`/`ofr-spec.md §6`).

## Импорт банковских выписок (1CClientBankExchange)

`POST /rest/erp/bank-statements/import?organizationId=<uuid>` — тело
запроса: сырой текст файла `kl_to_1c.txt` (windows-1251 или UTF-8), **не
JSON**. `Content-Type: text/plain` или `application/octet-stream` — оба
читаются как raw bytes (`request.rawBody`), CP1251 декодируется вручную
(`utils/decode-cp1251.util.ts`).

`application/octet-stream` для body-парсера в `main.ts` **скопирован только
на этот путь** (`req.url.startsWith('/rest/erp/bank-statements')` внутри
`type`-функции `useBodyParser('text', …)`) — глобально включён только
`text/plain`, как и до Фазы 6. Платформенный `PUT /file-upload/:id`
(`file-upload.controller.ts`) намеренно шлёт `application/octet-stream`,
чтобы ОБОЙТИ все body-парсеры и стримить тело напрямую в storage; глобальный
парсер на этом content-type тихо съедал бы тот стрим (0 байт → 204).

```bash
curl -X POST 'http://localhost:3000/rest/erp/bank-statements/import?organizationId=<uuid>' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: text/plain' \
  --data-binary @kl_to_1c.txt
```

Multipart не поддерживается: план (ruling) допускал multipart ИЛИ text
body — выбран raw text/octet-stream, т.к. оба потребителя MVP (MCP-тул
`import_bank_statement` и скрипты-загрузчики) отправляют файл напрямую, без
формы; multipart стоит добавить вместе с будущей UI-формой загрузки на
фронте (`<input type="file">` шлёт именно так).

MCP-тул `import_bank_statement(organizationId, text)` — тот же сервис,
`text` — уже декодированная строка (не сырые байты).

Ответ: `{ created: [{type, id, number, amountKopecks, counterparty}],
skipped: [...], errors: [...] }`. Создаёт только DRAFT payment/
supplierPayment — не проводит.

### Идемпотентность — ограничение MVP

Ключ повтора — префикс `comment` (`Импорт выписки: платёжка № … от …`) +
сумма + контрагент (`services/bank-statement-import.service.ts`). Если
пользователь вручную отредактирует `comment` созданного DRAFT-документа,
повторный импорт того же файла его не узнает и создаст дубль-DRAFT —
бухгалтер увидит два черновика и разберётся вручную. Осознанное упрощение
MVP, не баг.

## Банковская сверка (Task 3, Фаза 9)

`services/reconciliation.service.ts` + MCP-тулы `reconcile_payments`
(read-only, `canReadObjectRecords` на payment/supplierPayment/salesInvoice/
supplierInvoice) и `confirm_reconciliation` (write, `canUpdateObjectRecords`
на payment/supplierPayment) — оба в мосту `ErpAgentToolService`.

Для непривязанных (`salesInvoiceId`/`supplierInvoiceId` = null) DRAFT-
платежей организации подбираются кандидаты — POSTED-счета той же
организации с `paymentStatus` UNPAID/PARTIALLY_PAID, **обязательно** с тем
же ИНН контрагента (без совпадения ИНН счёт вообще не кандидат — не влияет
на скор). Скоринг (`utils/compute-reconciliation-score.util.ts`, pure):
сумма платежа точно равна остатку к оплате — вес 2; сумма ≤ остатка —
вес 1; назначение платежа (`comment`) содержит номер счёта — ещё +1 (итог до
3). Остаток к оплате = `invoice.total − invoice.paidAmount` — `paidAmount`
уже поддерживается атомарно `PaymentPostingRulesService`/
`SupplierPaymentPostingRulesService` при каждом проведении/отмене оплаты, то
есть это ровно «сумма POSTED-оплат, привязанных через существующую связь»,
без обращения к регистру `partyLedgerEntry` (задокументированное упрощение
ruling'а — не пересчитываем то, что уже посчитано).

`confirm_reconciliation(paymentId, invoiceId)` только проставляет связь
(`salesInvoiceId`/`supplierInvoiceId`) — не проводит платёж (проведение —
отдельный шаг, `post_document`). Валидация: тот же контрагент (ИНН) и та же
организация. Идемпотентность: повторный confirm той же пары — успех
(`alreadyLinked: true`), смена привязки уже привязанного платежа на другой
счёт — RU-отказ «Платёж уже привязан — отвяжите вручную» (проверяется до
загрузки нового счёта, независимо от того, существует ли он).

UI: без отдельного экрана (MVP) — привязка отражается в карточке платежа
штатно, полем «Счёт» (`sales-invoice-on-payment.field.ts`), которое уже
видимо в `payment-record-page-fields.view.ts` — это не тронуто Task 3,
платформенный рендер relation-поля.

## Закрытие месяца (Task 5, Фаза 9)

Документ `monthClose` (erp-accounting-приложение, без табличной части —
шапка `organization`/`period` (DATE, первое число месяца)/
`isYearReformation` (BOOLEAN) + стандартный набор). Провайдер
`services/month-close-posting-rules.service.ts` — только валидация (период,
future-guard, реформация только за декабрь, повторное закрытие — RU-отказ по
`findOne({..., withDeleted: true})` на POSTED monthClose той же организации
за тот же period) и нумерация `MC-<n>` (тот же приём, что и
`manualEntry` — сторонний register-эффект без строк, живёт в
`getPartyEntries`). Суммы считает и проводки пишет
`GlContributorsService.monthCloseGlEntries` — единственный контрибьютор,
который сам агрегирует регистр glEntry (SQL, `queryAccountTurnoverByCode`),
а не читает готовые итоги с документа/строк; чистая арифметика (сворачивающая
проводка, обнуление субсчетов при реформации, 99→84) — в
`utils/compute-month-close.util.ts` (`computeMonthCloseLegs`), покрыта
отдельными unit-тестами без БД.

Ежемесячно: сальдо счетов 90.01.1/90.02.1/90.03 за период → Дт/Кт
90.09↔99; аналогично 91.01/91.02 → 91.09↔99 (сумма 0 — строка не пишется).
«Нет оборотов за месяц» — RU-отказ, если ни один из пяти счетов не имеет
оборота за период (не путать с «результат = 0» — реальный оборот с нулевым
нетто месяца закрывается штатно, просто без строки). Реформация
(`isYearReformation`, только за декабрь): дополнительно обнуляет
90.01.1/90.02.1/90.03/91.01/91.02 взаимными проводками на 90.09/91.09 по
ГОДОВОМУ (1 января — конец периода) сальдо каждого субсчёта, и закрывает 99
на 84 по годовому нетто (99 в этой системе получает проводки только из
ежемесячных закрытий — годовое сальдо считается аналитически, без отдельного
SQL-запроса по счёту 99). Отмена — штатное сторно (реверс всех строк по
voucherId, как у любого другого документа); отмена реформации откатывает и
обнуление субсчетов, и 99→84 одним `cancelDocument`.

ОФР (`income_statement`) намеренно не видит 90.09/91.09/99/84 (см.
CRITICAL-комментарий в `compute-income-statement.util.ts`) — обычное
месячное закрытие НЕ меняет выручку/себестоимость в ОФР; меняет их только
реформация (она напрямую трогает 90.01.1/90.02.1/90.03/91.01/91.02).

MCP: `close_month(organizationId, month "YYYY-MM", isYearReformation?)` —
`services/month-close.service.ts` создаёт DRAFT monthClose (`postingDate` =
последний день месяца — не «сегодня», иначе ретроактивное закрытие датировало
бы проводки днём вызова) и сразу проводит его одним вызовом; permission —
`canUpdateObjectRecords('monthClose')`, как у `post_document`. Мост
`ErpAgentToolService` — тот же фактори, что и в MCP-тулсете (без обёртки:
результат уже `{success, message, ...}`).

### Идемпотентность close_month — ретрай, не дубли

`create` и `post` — две разные транзакции (`post()` — своя, внутри
`posting.service.ts`), поэтому вызов НЕ атомарен: если `post()` упадёт
(гонка с другим `close_month` за тот же период, «Нет оборотов за месяц»,
любое исключение провайдера/контрибьютора) — DRAFT, созданный на первом шаге,
остаётся в БД непроведённым. Повторный вызов `close_month` с теми же
`(organizationId, month, isYearReformation)` находит этот DRAFT (`findOne` по
всем трём полям + `docStatus: DRAFT`) и переиспользует его id вместо
создания нового — ретрай идемпотентен, черновики-сироты не накапливаются.
Мягко удалённый (`deletedAt`) DRAFT НЕ подхватывается намеренно (без
`withDeleted`) — раз пользователь явно удалил черновик, ретрай должен
создать новый, а не воскрешать удалённый.
