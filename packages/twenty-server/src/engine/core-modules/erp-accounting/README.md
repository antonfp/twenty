# ERP block «Бухгалтерия» — server (erp-accounting)

Серверная часть блока бухгалтерии: GL-контрибьюторы, lock date, провайдер
`manualEntry`, ОСВ-отчёт, импорт банковских выписок. Метаданные объектов
ставит SDK-приложение (`packages/twenty-apps/internal/erp-accounting`); этот
модуль — только код-сторона.

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
