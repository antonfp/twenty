# internal/ — карта внутренних приложений

## ERPilot ERP: три зависимых блока

Phase 3.5 Task 3 разрезала монолитное приложение `erp`
(universalIdentifier `d356931a-f402-4a7c-89d9-c8497bbe838e`, теперь удалено)
на три самостоятельных Twenty-приложения, связанных декларативной
зависимостью (`ApplicationManifest.dependencies`, Phase 3.5 Task 1/2):

```
erp-base  ──depended-on-by──▶  erp-sales
    ▲                          erp-purchases
    └──────────depended-on-by──────┘
```

| Проект          | universalIdentifier                    | dependencies | Содержимое |
|------------------|-----------------------------------------|--------------|------------|
| `erp-base`       | `5de98d5e-9e03-43c3-9a68-6e2918d32613` | —            | Справочники (organization/item/warehouse/priceType/itemPrice + поля Компании) + регистр `partyLedgerEntry` («Взаиморасчёты») + post-install seed |
| `erp-sales`      | `4c1b056f-b6d2-4cde-a3a1-2faffd48ac6b` | `erp-base`   | salesInvoice/salesInvoiceLine/payment, папка «Продажи» |
| `erp-purchases`  | `c8b7a31b-ed73-4b8b-ad1e-a8f6b7ae51f1` | `erp-base`   | supplierInvoice/supplierInvoiceLine/supplierPayment, папка «Закупки» |

Объекты и поля (и их universalIdentifier) не менялись при разрезании — только
перераспределены между тремя проектами; на именах/uid объектов и полей
завязаны серверные модули `erp-sales`/`erp-purchases` в `twenty-server` и
регресс-e2e (`tools/erp-e2e/`). Новые universalIdentifier сгенерированы
только для самих трёх приложений (см. таблицу выше и README каждого проекта).

### Порядок установки/удаления

Строгий из-за зависимости: `erp-base` → `erp-sales` → `erp-purchases` на
установке; в обратном порядке (или в любом порядке зависимых раньше базового)
на удалении. Сервер (Phase 3.5 Task 2) это форсирует:

- `apply`/установка `erp-sales` или `erp-purchases` без установленного
  `erp-base` → ошибка `APP_NOT_INSTALLED` с именем недостающей зависимости;
- `uninstall erp-base` при установленном `erp-sales`/`erp-purchases` →
  отказ `FORBIDDEN` с именами зависимых приложений.

### Почему локальный SDK через `portal:`, а не npm

`erp-sales`/`erp-purchases` объявляют `dependencies: [...]` в
`defineApplication()` — поле, добавленное в контракт манифеста в Phase 3.5
Task 1. Опубликованный в npm `twenty-sdk@2.33.0` (последняя версия,
доступная на момент задачи) собран ДО этого изменения — его тип
`ApplicationConfig` не знает про `dependencies`, и typecheck манифест-билдера
падает:

```
src/application-config.ts(18,3): Object literal may only specify known
properties, and 'dependencies' does not exist in type 'ApplicationConfig'.
```

(проверено фактом сборки — `erp-base` этого не требует и собирается на npm
2.33.0 без проблем, `erp-sales`/`erp-purchases` с `dependencies:` — нет).
Решение: `erp-sales`/`erp-purchases` подключают локально собранный
`packages/twenty-sdk` через Yarn `portal:` (см. их `package.json` и README).
Простой `file:` не годится по той же причине, что была задокументирована ещё
в README старого `erp`: локальный `twenty-sdk` зависит от
`twenty-client-sdk: workspace:*`, которое вне монорепы не резолвится. Голый
`portal:` для `twenty-sdk` тоже не резолвит эту транзитивную зависимость
(Yarn падает с `Workspace not found`) — понадобился явный
`resolutions.twenty-client-sdk` тоже на `portal:`, форсирующий её и для
прямой, и для транзитивной ссылки. `erp-base` без `dependencies` в этом не
нуждается и остался на опубликованном `twenty-sdk@2.33.0` — но для
единообразия трёх проектов и одинакового контракта манифеста тоже переведён
на тот же локальный `portal:`-набор (см. `erp-base/README.md`).

Собирать нужно под arm64 Node: `volta run --node 24.5.0 --yarn 4.13.0 --
yarn twenty <cmd>` — портал резолвит `sharp` из корневого `node_modules`
монорепы (собран под arm64), под системным x64 Node сборка падает.

### Прочие внутренние приложения

- `real-estate`, `self-hosting`, `twenty-partners` — не связаны с ERPilot ERP,
  без изменений в рамках этой задачи.
