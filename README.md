# ERPilot

ERPilot is an internal ERP platform: connect the blocks you need — sales,
purchases, finance — and run the business with AI assistance built in. It is
based on a fork of [Twenty CRM](https://github.com/twentyhq/twenty), licensed
under AGPL-3.0 (see [LICENSE](./LICENSE)).

## What's inside

- `packages/twenty-front` — React 18 / Jotai / Linaria / Vite frontend
- `packages/twenty-server` — NestJS / TypeORM / PostgreSQL / Redis / GraphQL backend
- `packages/twenty-shared`, `packages/twenty-ui` — isomorphic types/utils and the UI kit
- `packages/twenty-sdk`, `packages/twenty-cli` — application SDK/CLI for building apps on the platform
- `packages/twenty-apps/internal/erp-base`, `erp-sales`, `erp-purchases` — the ERPilot ERP blocks (directories & settlement ledger, sales, purchases) — see each app's own README
- `packages/twenty-e2e-testing` — Playwright UI tests; `tools/erp-e2e` — live end-to-end regression scripts for the sales and purchases cycles

## Dev stack

```bash
bash packages/twenty-utils/setup-dev-env.sh   # Postgres/Redis + DB init
yarn start                                    # front (:3001) + server (:3000) + worker
```

See `CLAUDE.md` for test/lint/typecheck commands and repo-specific gotchas.

## License

AGPL-3.0, inherited from the upstream Twenty CRM project — see [LICENSE](./LICENSE).
