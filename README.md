# Nostos Operator Console

Internal admin console for Nostos staff to create and repair households — magic-link signin,
service metrics, household search and inspection, household creation, reversible deletion, and
admin-invite resend.

This is the **operator** console. Household members never see it.

## Setup

```bash
npm install
cp .env.example .env     # or create .env with the line below
npm run dev
```

```bash
# .env
VITE_API_URL=http://localhost:3000
```

The console needs the Nostos backend running — it is the only source of data, and signin
cannot be faked locally. Endpoints live under `{VITE_API_URL}/api/v1/console`.

## Commands

| Command | Does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm test` | Vitest in watch mode |
| `npx vitest run` | Full suite, one shot |
| `npm run build` | `tsc -b` then production build |
| `npm run lint` | ESLint over the repo |
| `npm run preview` | Serve the production build |

There is no CI workflow. The gate is `npm run build && npm run lint && npx vitest run`, run by
hand. Build and tests are green; **lint currently reports 5 pre-existing errors** — see
`docs/FRONTEND.md` §11.

## Stack

React 19 · TypeScript · Vite 8 · React Router 7 · TanStack Query 5 · React Hook Form · Axios ·
Vitest + Testing Library + MSW. Plain CSS with custom properties — no CSS framework.

State has exactly one owner per kind: server data in TanStack Query, filters in URL search
params, session in one React Context, forms in React Hook Form, everything else in `useState`.
There is deliberately no global client-state store.

## Routes

```
/signin                         magic-link signin        public
/auth/signin/:token             token exchange           public
/                               dashboard metrics        protected
/households                     list                     protected
/households/new                 create                   protected
/households/:id                 detail                   protected
```

## Where to read next

**[`docs/FRONTEND.md`](docs/FRONTEND.md) is the authoritative technical document** — read it
before any non-trivial change. It covers the auth model, the API contract, data-fetching
rules, known defects, and the open items.

- [`PRODUCT.md`](PRODUCT.md) — who this is for, what the words mean, what is deliberately undecided
- [`DESIGN.md`](DESIGN.md) — the design system as shipped
- [`docs/console-auth-api-contract.md`](docs/console-auth-api-contract.md) — verified auth request/response shapes
- [`notes/FE/`](notes/FE/) — source PRDs and architecture. They predate the build; `docs/FRONTEND.md` wins where they disagree.
