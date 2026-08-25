# ERP block «Продажи» (erp-sales)

Серверная часть блока продаж: правила проведения для `salesInvoice` и
`payment`, guard-хуки на документы и регистр `partyLedgerEntry`, печатная
форма «Счёт на оплату». Метаданные объектов ставит SDK-приложение
(`packages/twenty-apps/internal/erp`, модуль `sales`); этот модуль только
код-сторона.

## Контракты (объекты и поля)

- `salesInvoice`: `docStatus` (DRAFT/POSTED/CANCELLED), `postingDate`,
  `postedAt`, `cancelledAt`, `number`, `name`, `total` (CURRENCY),
  `vatTotal` (CURRENCY), `paidAmount` (CURRENCY), `paymentStatus`
  (UNPAID/PARTIALLY_PAID/PAID), `customerId` → company, `organizationId` →
  organization.
- `salesInvoiceLine`: `salesInvoiceId`, `name`, `quantity` (NUMBER), `price`
  (CURRENCY), `vatRate` (VAT_20/VAT_10/VAT_0/NO_VAT), `amount` (CURRENCY),
  опционально `itemId` → item.
- `payment`: `amount` (CURRENCY), `salesInvoiceId`, `payerId` → company,
  `number`, `name`, `docStatus`, `postingDate`.
- Регистр `partyLedgerEntry`: `name`, `companyId`, `organizationId`,
  `voucherType`, `voucherId`, `amount` (CURRENCY), `postingDate`,
  `isCancelled`, `isCancellation`.

CURRENCY-поля композитные: репозитории twenty-orm читают/пишут их вложенным
объектом `{ amountMicros, currencyCode }` (1 руб = 1 000 000 микро,
1 коп = 10 000 микро). Вся денежная математика в модуле идёт в целых
копейках (`utils/erp-sales-money.util.ts`).

Тип `PartyLedgerEntryInput` в ядре (`erp/types/posting.types.ts`) старее
контракта регистра (`partyId`/`direction`); `PostingService` вставляет
строки провайдера как есть, поэтому провайдеры возвращают строку в форме
установленного регистра (`ErpPartyLedgerEntryRow`) с кастом на границе.

## Проведение счёта (`SalesInvoicePostingRulesService`)

- validate: ≥ 1 строки; в каждой `quantity > 0`, `price ≥ 0`.
- НДС в цене: `сумма строки = quantity × price` (округление до копейки),
  `НДС строки = сумма × ставка / (100 + ставка)`, округление до копейки
  half-away-from-zero (как 1С); NO_VAT/VAT_0 → 0. Итоги — суммы копеек по
  строкам.
- Побочные записи (в транзакции проведения): пересчитанные `amount` строк,
  `total`/`vatTotal`, номер через `DocumentNumberingService` (префикс `SI`,
  только если `number` пуст), `name` = «Счёт № N от DD.MM.YYYY».
- Регистр: одна строка `+total`, `companyId = customerId`,
  `voucherType = 'salesInvoice'`.

## Проведение оплаты (`PaymentPostingRulesService`)

- validate: `amount > 0`; связанный счёт существует и в статусе POSTED
  (загружается в транзакции).
- Регистр: одна строка `−amount`, `companyId = payerId` (fallback —
  customer счёта), `voucherType = 'payment'`.
- Побочные записи: `paidAmount += amount` на счёте; `paymentStatus = PAID`,
  если `paidAmount ≥ total`, иначе PARTIALLY_PAID; номер `PM-…`, имя
  «Оплата № N от …».

## Отмена (cancel)

Ядро (`PostingService.cancelInTransaction`) при отмене само пишет
сторно-строки регистра и помечает оригиналы `isCancelled`; провайдеры при
отмене **не вызываются** — контракт `PostingRulesProvider` не имеет
cancel-хука.

- TODO (контракт ядра): при отмене оплаты `paidAmount`/`paymentStatus`
  счёта НЕ откатываются — выразить это через текущий контракт невозможно
  без хака ядра. Нужен cancel-хук провайдера в `PostingService`.
- TODO (ядро + приложение): `buildReversalRows` в ядре инвертирует только
  плоские числовые поля (`typeof value === 'number'`), а `amount` регистра
  установлен как CURRENCY (композит `{ amountMicros }`) — сторно-строка
  получит **неинвертированную** сумму. Либо регистр должен объявить
  `amount` как NUMBER, либо `buildReversalRows` должен научиться
  инвертировать композиты. Зафиксировано честно, ядро не хакаем.

## Guard-хуки (`query-hooks/erp-sales-guard.pre-query.hooks.ts`)

- `salesInvoice`/`payment`: `updateOne/updateMany/deleteOne/deleteMany/`
  `destroyOne/destroyMany` блокируются, если `docStatus !== 'DRAFT'`
  (запись загружается в хуке). Массовые операции проверяются по id из
  фильтра; фильтр, не ограниченный id, отклоняется (fail closed).
  Дополнительно: `docStatus`, `postedAt`, `cancelledAt`, `paidAmount`,
  `paymentStatus` нельзя менять руками даже у черновика, а `createOne/`
  `createMany` не могут создать документ сразу POSTED — иначе проведение
  можно было бы подделать без регистров.
- `partyLedgerEntry`: все мутации (`createOne…destroyMany`) блокируются
  безусловно — регистр пишет только сервер при проведении.
- `salesInvoiceLine` (и `supplierInvoiceLine` в `erp-purchases`, тот же
  сервис): строку нельзя создать/изменить/удалить, если её родительский
  документ (`salesInvoiceId`/`supplierInvoiceId`) существует и
  `docStatus !== 'DRAFT'` — иначе строки проведённого счёта оставались
  редактируемыми, хотя сам документ уже был защищён. Для create родитель
  берётся из payload; для update/delete — по строке из БД. Строка без
  родителя (id null) разрешена всегда. Массовые операции — тот же fail-closed
  паттерн по id из фильтра (`ErpDocumentLineGuardService`,
  `services/erp-document-line-guard.service.ts`).

Хуки обходятся только серверными репозиториями (сам `PostingService`),
GraphQL/REST/MCP идут через них.

## Печатная форма

`GET /rest/erp/sales-invoices/:id/print` (авторизация как у остального
REST: JWT + workspace) → готовый HTML (`Content-Type: text/html`) счёта по
шаблону `docs/erp-design/schet-template.html` (встроен как строковая
константа `constants/schet-template.constant.ts`, т.к. сборка сервера не
копирует не-TS ассеты). Подстановка — простой replace плюс размножение
блока `<!-- BEGIN line -->`; шаблонизатора нет. Итоги пересчитываются из
строк (форма корректна и для черновика). Сумма прописью —
`erp/utils/amount-in-words-ru.util.ts`. Строка НДС: `vatTotal = 0` → «Без
налога (НДС): —»; одна ставка → «В том числе НДС (20%):»; смешанные ставки
(MVP) → «В том числе НДС:». Пустые реквизиты выводятся пустыми строками.

## Известные TODO

1. Откат `paidAmount`/`paymentStatus` при отмене оплаты (см. «Отмена»).
2. Сторно CURRENCY-поля `amount` регистра (см. «Отмена»).
3. PDF-рендер печатной формы (Puppeteer `page.pdf`) — сейчас отдаём HTML,
   печать средствами браузера.
4. Валидация «одна ставка НДС на документ» (MVP-запрет смешанных ставок из
   schet-spec §6.3) не включена — печать смешанных ставок выводит метку без
   процента.
5. Разрешённые поля на POSTED-документе (теги/комментарий) — сейчас
   блокируется любое изменение.
