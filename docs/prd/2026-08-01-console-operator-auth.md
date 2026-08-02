# Console Operator Authentication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a NOSTOS operator (internal staff) sign in to the operator console via a passwordless magic-link email, get a Postgres-backed session distinct from the household-member session, and log out — with every attempt rate-limited and audited.

**Architecture:** A NestJS feature module (`ConsoleAuthModule`) reuses the app's existing single Postgres-backed `express-session` middleware and cookie, adding a second session field (`session.operator`) alongside the existing `session.user`. Two new guards (`OperatorGuard`, `ActivityRefreshGuard`) protect operator routes; they are applied locally per-controller, never globally, because operators are not household members and must bypass the existing `AuthGuard`/`TenantGuard`/`RoleGuard` trio entirely (every `/console/*` route is `@Public()`). Three new Prisma models (`Operator`, `Invite`, `OperatorAuditLog`) back the flow. Email goes through a small `EmailService` abstraction — `Resend` in production, a winston-backed console logger otherwise — so no test or dev run ever needs a real Resend API key.

**Tech Stack:** NestJS 11, Prisma 6.19.3, `express-session` (existing Postgres store), `resend` (new dependency), Jest + supertest.

**Source spec:** `docs/prd/prd-auth-console-be.md` — this plan implements the subset of Section 1 that does not depend on household records existing yet: `POST /console/auth/signin`, `GET /console/auth/signin/:token`, `POST /console/auth/logout`, the `OperatorGuard`/`ActivityRefreshGuard` pair from Section 2, the operator/invite/audit-log indexes from Section 3 that this slice owns, the signin rate limit from Section 4, the `SIGNIN`/`LOGOUT` audit actions from Section 5, and the operator signin email from Section 7. Household creation, listing, deletion, resend-invite and dashboard metrics (the rest of Section 1) are a separate, later plan that builds on top of this one.

## Global Constraints

These apply to every task below; they are called out once here instead of repeated per task.

- **Response envelope wins over the PRD's illustrative JSON.** This codebase already has one success envelope (`{ success: true, data, message? }`, applied globally by `TransformInterceptor`) and one error envelope (`{ success: false, error: { code, message, statusCode, timestamp, path, details? } }`, applied globally by `AllExceptionsFilter`). The PRD's example bodies are flat (e.g. `{ "success": true, "message": "...", "email": "..." }`) because it predates this backend's foundation. Every endpoint in this plan returns the endpoint-specific fields as the handler's return value; the interceptor nests them under `data` automatically. Use `@ResponseMessage('...')` for the PRD's `message` text. Do not hand-construct `{ success, ... }` objects in a handler — that double-wraps under the interceptor.
- **Every `/console/*` route is `@Public()`.** The global `AuthGuard`/`TenantGuard`/`RoleGuard` trio exists for household-member routes and checks `session.user` / `X-Household-ID`, neither of which applies to operators. Without `@Public()` on every handler in this plan, the global `AuthGuard` would 401 every console request before `OperatorGuard` ever runs. `@Public()` is method-scoped only (see `src/common/guards/is-public.ts`) — it must be applied to each handler individually, not the controller class.
- **One session, one cookie.** The app has exactly one Postgres-backed `express-session` middleware, registered once in `src/config/session-middleware.provider.ts` and named `household.sid` (`SESSION_COOKIE_NAME` in `src/config/session.config.ts`). The PRD's `connect.sid` in its examples is express-session's generic default name, not a literal requirement — this plan adds a second field (`session.operator`) to the *existing* session data shape rather than standing up a second session store. Do not introduce a second `express-session` instance or cookie.
- **Magic-link tokens are 32 random bytes, hex-encoded (64 chars), hashed with SHA-256 before storage.** The raw token is only ever held in memory long enough to build the email link and is never persisted. `invites.tokenHash` stores the hex digest.
- **Rate limiting is a direct Postgres query, not Redis and not `@nestjs/throttler`'s per-IP tracker.** The PRD explicitly allows "Redis or DB"; this stack has no Redis dependency today, and the limit is keyed by email, not IP, which is what `@nestjs/throttler`'s default tracker keys on. The existing global `ThrottlerGuard` (100/min, IP-keyed) still runs on these routes as a separate, coarser layer — this plan does not skip it.
- **Email templates are plain functions returning `{ subject, html, text }`, not React Email components.** This is a NestJS backend with no React toolchain; the PRD's "React Email component" line describes a frontend-repo concern that does not apply here.
- **E2E tests never depend on `npm run seed` having run.** CI (`.github/workflows/backend.yml`) runs `migrate:deploy` but not `seed`. Every e2e spec in this plan that needs an `Operator` row creates and tears it down itself via `PrismaService`, the same way `test/session.e2e-spec.ts` manages its own `session` table rows.
- **`FRONTEND_URL` is reused as the console's origin** for both magic-link/redirect targets and the existing CORS allowlist. No separate `CONSOLE_URL` is introduced — there is no evidence yet of the console being hosted on a different origin than the rest of the frontend.
- All curated error/success copy is the PRD's exact wording, passed as an explicit `message` argument to `AppException` or `@ResponseMessage()` — never derived from the shared `ErrorMessage` map, which is a fallback for framework-thrown exceptions only (see `src/common/constants/messages.ts`'s own doc comment and `AllExceptionsFilter`'s `AppException` branch).

---

## File Structure

```
prisma/schema.prisma                          [MODIFY] + OperatorStatus, InviteTokenType enums; Operator, Invite, OperatorAuditLog models
prisma/seed-constants.ts                      [MODIFY] + OPERATOR_ID
prisma/seed.ts                                 [MODIFY] seed one Operator row (dev convenience only)
.env.example                                   [MODIFY] + RESEND_API_KEY, EMAIL_FROM_ADDRESS, SEED_OPERATOR_EMAIL
src/config/env.validation.ts                   [MODIFY] + RESEND_API_KEY (optional), EMAIL_FROM_ADDRESS, production-required check
src/common/types/operator-session.ts           [CREATE] OperatorSessionUser
src/common/types/express-session.d.ts          [MODIFY] + session.operator
src/common/guards/operator.guard.ts            [CREATE]
src/common/guards/operator.guard.spec.ts       [CREATE]
src/common/guards/activity-refresh.guard.ts    [CREATE]
src/common/guards/activity-refresh.guard.spec.ts [CREATE]
src/common/decorators/get-operator.decorator.ts [CREATE]
src/common/decorators/decorators.spec.ts       [MODIFY] + GetOperator tests
src/email/email.interface.ts                   [CREATE] EmailService, SendEmailParams, EMAIL_SERVICE token
src/email/console-email.service.ts             [CREATE] dev/test-safe fallback (logs via winston)
src/email/console-email.service.spec.ts        [CREATE]
src/email/resend-email.service.ts              [CREATE] real Resend-backed implementation
src/email/resend-email.service.spec.ts         [CREATE]
src/email/email.config.ts                      [CREATE] createEmailService() factory function
src/email/email.config.spec.ts                 [CREATE]
src/email/email.module.ts                      [CREATE] @Global() DI wiring
src/email/templates/operator-signin.template.ts [CREATE]
src/email/templates/operator-signin.template.spec.ts [CREATE]
src/audit/audit-log.service.ts                 [CREATE]
src/audit/audit-log.service.spec.ts             [CREATE]
src/audit/audit-log.module.ts                   [CREATE] @Global() DI wiring
src/console-auth/dto/signin-request.dto.ts      [CREATE]
src/console-auth/console-auth.service.ts        [CREATE]
src/console-auth/console-auth.service.spec.ts   [CREATE]
src/console-auth/console-auth.controller.ts     [CREATE]
src/console-auth/console-auth.module.ts         [CREATE]
src/app.module.ts                               [MODIFY] + EmailModule, AuditLogModule, ConsoleAuthModule
test/create-test-app.ts                        [MODIFY] + ConsoleProbeModule import; later + optional module-override param
test/fixtures/console-probe.module.ts          [CREATE] test-only, mirrors test/fixtures/probe.module.ts
test/fixtures/fake-email.service.ts             [CREATE] test-only, captures sent emails
test/operator-guards.e2e-spec.ts                [CREATE]
test/console-auth.e2e-spec.ts                   [CREATE]
```

---

### Task 1: Prisma schema — Operator, Invite, OperatorAuditLog

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/seed-constants.ts`
- Modify: `prisma/seed.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: Prisma models `Operator { id, email, status, createdAt, lastLoginAt }`, `Invite { id, email, tokenType, tokenHash, expiresAt, usedAt, createdAt }`, `OperatorAuditLog { id, operatorId, action, householdId, details, ipAddress, userAgent, createdAt }`; enums `OperatorStatus { ACTIVE, INACTIVE }`, `InviteTokenType { OPERATOR_SIGNIN }`. All accessible via `PrismaService` (`prisma.operator`, `prisma.invite`, `prisma.operatorAuditLog`) since `PrismaModule` is `@Global()`.
- Produces: `OPERATOR_ID` exported from `prisma/seed-constants.ts`.

This task has no unit test of its own — a schema migration is verified by applying cleanly and by every later task's tests passing against the generated client.

- [ ] **Step 1: Add the enums and models to the schema**

Open `prisma/schema.prisma` and insert the following after the `Session` model (end of file):

```prisma
enum OperatorStatus {
  ACTIVE
  INACTIVE
}

enum InviteTokenType {
  OPERATOR_SIGNIN
}

model Operator {
  id          String         @id @default(uuid()) @db.Uuid
  email       String         @unique
  status      OperatorStatus @default(ACTIVE)
  createdAt   DateTime       @default(now())
  lastLoginAt DateTime?

  auditLogs OperatorAuditLog[]

  @@index([email])
  @@index([status])
  @@map("operators")
}

/// Magic-link tokens. Only OPERATOR_SIGNIN exists today; a later plan widens
/// this enum (and adds householdId/role columns) for the admin-claim flow —
/// deliberately not modelled here (YAGNI): those columns would sit unused by
/// every row this plan ever writes.
model Invite {
  id        String          @id @default(uuid()) @db.Uuid
  email     String
  tokenType InviteTokenType
  tokenHash String          @unique
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime        @default(now())

  @@index([email])
  @@index([expiresAt])
  @@index([usedAt])
  @@map("invites")
}

/// operatorId is nullable so a signin attempt against an unknown/inactive
/// email can still be reasoned about later, mirroring the PRD's "operator_id
/// (if success)" audit field. householdId is nullable here because every
/// action this plan writes (SIGNIN, LOGOUT) is not scoped to a household; a
/// later plan populates it for household-management actions.
model OperatorAuditLog {
  id          String   @id @default(uuid()) @db.Uuid
  operatorId  String?  @db.Uuid
  action      String
  householdId String?  @db.Uuid
  details     Json?
  ipAddress   String?
  userAgent   String?
  createdAt   DateTime @default(now())

  operator Operator? @relation(fields: [operatorId], references: [id])

  @@index([operatorId, createdAt])
  @@index([householdId, createdAt])
  @@index([action, createdAt])
  @@map("operator_audit_logs")
}
```

- [ ] **Step 2: Generate and apply the migration**

Run: `npm run migrate:dev -- --name add_console_operator_auth`

Expected: Prisma prints `Your database is now in sync with your schema` and creates
`prisma/migrations/<timestamp>_add_console_operator_auth/migration.sql`. `npx prisma generate`
runs automatically as part of `migrate dev`.

- [ ] **Step 3: Verify the generated client compiles**

Run: `npm run type-check`

Expected: exits 0. (Nothing references the new models yet, so this mainly proves the migration
didn't leave the schema in a broken state.)

- [ ] **Step 4: Add a deterministic seed id**

Edit `prisma/seed-constants.ts`, adding one line (this file must stay import-free and
side-effect-free — see its own doc comment):

```typescript
export const HOUSEHOLD_ID = '00000000-0000-4000-8000-000000000001';
export const ADMIN_ID = '00000000-0000-4000-8000-000000000002';
export const MEMBER_ID = '00000000-0000-4000-8000-000000000003';
/** A second household, so cross-tenant tests have a real foreign id. */
export const OTHER_HOUSEHOLD_ID = '00000000-0000-4000-8000-0000000000ff';
/** An operator for local/manual testing of the console signin flow. */
export const OPERATOR_ID = '00000000-0000-4000-8000-000000000010';
```

- [ ] **Step 5: Seed one Operator row (dev convenience only — no automated test depends on this)**

Edit `prisma/seed.ts`. Change the import line:

```typescript
import { OperatorStatus, PrismaClient, Role } from '@prisma/client';
```

Change the seed-constants import:

```typescript
import {
  ADMIN_ID,
  HOUSEHOLD_ID,
  MEMBER_ID,
  OPERATOR_ID,
  OTHER_HOUSEHOLD_ID,
} from './seed-constants';
```

Inside `main()`, after the closing of the `prisma.$transaction(async (tx) => { ... })` block
(the operator has no FK relationship to households/users, so it does not need to be inside
that transaction) and before the final `console.log`, add:

```typescript
  const operatorEmail =
    process.env.SEED_OPERATOR_EMAIL ?? 'operator@household.test';

  await prisma.operator.upsert({
    where: { id: OPERATOR_ID },
    update: { email: operatorEmail, status: OperatorStatus.ACTIVE },
    create: { id: OPERATOR_ID, email: operatorEmail, status: OperatorStatus.ACTIVE },
  });
```

Update the summary log line to:

```typescript
  console.log(
    `Seeded household ${HOUSEHOLD_ID}: 2 users, ${EXPENSE_TYPES.length} types, ${PAYMENT_SOURCES.length} sources, 1 operator`,
  );
```

- [ ] **Step 6: Add the seed env var to `.env.example`**

In the `# ---- Seed (dev only) ----` section, after `SEED_MEMBER_PASSWORD`, add:

```
SEED_OPERATOR_EMAIL=operator@household.test
```

- [ ] **Step 7: Run the seed against the local dev database and verify**

Run: `npm run db:up && npm run migrate:dev && npm run seed`

Expected: output ends with `Seeded household ...: 2 users, 5 types, 4 sources, 1 operator`, and
no errors. (`migrate:dev` here is a no-op re-check since Step 2 already applied it — it is
listed so this step works standalone if run out of order.)

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/seed-constants.ts prisma/seed.ts prisma/migrations .env.example
git commit -m "feat(schema): add Operator, Invite and OperatorAuditLog models"
```

---

### Task 2: Session type, OperatorGuard, GetOperator decorator, console test fixture

**Files:**
- Create: `src/common/types/operator-session.ts`
- Modify: `src/common/types/express-session.d.ts`
- Create: `src/common/guards/operator.guard.ts`
- Create: `src/common/guards/operator.guard.spec.ts`
- Create: `src/common/decorators/get-operator.decorator.ts`
- Modify: `src/common/decorators/decorators.spec.ts`
- Create: `test/fixtures/console-probe.module.ts`
- Modify: `test/create-test-app.ts`
- Create: `test/operator-guards.e2e-spec.ts`

**Interfaces:**
- Consumes: `AppException` (`src/common/exceptions/app.exception.ts`), `ErrorCode`/`ErrorMessage` (`src/common/constants/`), `PrismaService` (`src/database/prisma.service.ts`), `Operator`/`OperatorStatus` from `@prisma/client` (Task 1).
- Produces: `OperatorSessionUser { id: string; email: string; role: 'OPERATOR'; sessionCreatedAt: string; lastActivityAt: string }`; `SessionData.operator?: OperatorSessionUser` (express-session module augmentation); `OperatorGuard` class; `GetOperator()` param decorator returning `OperatorSessionUser`; `test/fixtures/console-probe.module.ts` exporting `ConsoleProbeModule`, `SEED_OPERATOR_ID`, `SEED_OPERATOR_EMAIL`.

- [ ] **Step 1: Add the session type**

Create `src/common/types/operator-session.ts`:

```typescript
/**
 * What ConsoleAuthService writes into the session on a successful magic-link
 * click. Distinct from SessionUser (household members) — operators are
 * internal staff with no household, so this type carries no householdId.
 */
export interface OperatorSessionUser {
  id: string;
  email: string;
  role: 'OPERATOR';
  sessionCreatedAt: string;
  lastActivityAt: string;
}
```

- [ ] **Step 2: Augment the session data shape**

Edit `src/common/types/express-session.d.ts`:

```typescript
import type { OperatorSessionUser } from './operator-session';
import type { SessionUser } from './session-user';

declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
    operator?: OperatorSessionUser;
  }
}
```

- [ ] **Step 3: Write the failing OperatorGuard test**

Create `src/common/guards/operator.guard.spec.ts`:

```typescript
import { ExecutionContext } from '@nestjs/common';
import { OperatorStatus } from '@prisma/client';

import { AppException } from '../exceptions/app.exception';
import type { PrismaService } from '../../database/prisma.service';
import { OperatorGuard } from './operator.guard';

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const sessionOperator = {
  id: '00000000-0000-4000-8000-000000000010',
  email: 'operator@household.test',
  role: 'OPERATOR' as const,
  sessionCreatedAt: '2026-07-31T10:00:00.000Z',
  lastActivityAt: '2026-07-31T10:00:00.000Z',
};

describe('OperatorGuard', () => {
  it('rejects a request with no session.operator', async () => {
    const prisma = { operator: { findUnique: jest.fn() } };
    const guard = new OperatorGuard(prisma as unknown as PrismaService);

    await expect(guard.canActivate(contextFor({ session: {} }))).rejects.toThrow(
      AppException,
    );
    expect(prisma.operator.findUnique).not.toHaveBeenCalled();
  });

  it('rejects when the operator no longer exists', async () => {
    const prisma = {
      operator: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    const guard = new OperatorGuard(prisma as unknown as PrismaService);

    await expect(
      guard.canActivate(contextFor({ session: { operator: sessionOperator } })),
    ).rejects.toThrow(AppException);
  });

  it('rejects when the operator is INACTIVE', async () => {
    const prisma = {
      operator: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...sessionOperator, status: OperatorStatus.INACTIVE }),
      },
    };
    const guard = new OperatorGuard(prisma as unknown as PrismaService);

    await expect(
      guard.canActivate(contextFor({ session: { operator: sessionOperator } })),
    ).rejects.toThrow(AppException);
  });

  it('allows an ACTIVE operator', async () => {
    const prisma = {
      operator: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ...sessionOperator, status: OperatorStatus.ACTIVE }),
      },
    };
    const guard = new OperatorGuard(prisma as unknown as PrismaService);

    await expect(
      guard.canActivate(contextFor({ session: { operator: sessionOperator } })),
    ).resolves.toBe(true);
  });
});
```

- [ ] **Step 4: Run it and watch it fail**

Run: `npx jest src/common/guards/operator.guard.spec.ts`

Expected: FAIL — `Cannot find module './operator.guard'`.

- [ ] **Step 5: Implement OperatorGuard**

Create `src/common/guards/operator.guard.ts`:

```typescript
import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { OperatorStatus } from '@prisma/client';
import type { Request } from 'express';

import { ErrorCode } from '../constants/errors';
import { ErrorMessage } from '../constants/messages';
import { AppException } from '../exceptions/app.exception';
import { PrismaService } from '../../database/prisma.service';

/**
 * Applied locally (`@UseGuards(OperatorGuard)`), never globally — unlike
 * AuthGuard, this has no @Public() escape hatch because every console route
 * already opts out of the household-member guard trio via @Public() (see the
 * plan's Global Constraints). Queries the operator live on every request
 * rather than trusting the session snapshot, so deactivating an operator
 * takes effect on their very next request instead of waiting out a 7-day
 * cookie.
 */
@Injectable()
export class OperatorGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionOperator = request.session?.operator;

    if (!sessionOperator) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        ErrorMessage[ErrorCode.UNAUTHORIZED],
        HttpStatus.UNAUTHORIZED,
      );
    }

    const operator = await this.prisma.operator.findUnique({
      where: { id: sessionOperator.id },
    });

    if (!operator || operator.status !== OperatorStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        ErrorMessage[ErrorCode.UNAUTHORIZED],
        HttpStatus.UNAUTHORIZED,
      );
    }

    return true;
  }
}
```

- [ ] **Step 6: Run it and watch it pass**

Run: `npx jest src/common/guards/operator.guard.spec.ts`

Expected: PASS, 4 tests.

- [ ] **Step 7: Add GetOperator decorator tests**

Edit `src/common/decorators/decorators.spec.ts`. Add an import:

```typescript
import { GetOperator } from './get-operator.decorator';
```

Add, after the existing `describe('GetHousehold', ...)` block:

```typescript
const sessionOperator = {
  id: '00000000-0000-4000-8000-000000000010',
  email: 'operator@household.test',
  role: 'OPERATOR' as const,
  sessionCreatedAt: '2026-07-31T10:00:00.000Z',
  lastActivityAt: '2026-07-31T10:00:00.000Z',
};

describe('GetOperator', () => {
  it('returns the session operator', () => {
    const factory = paramFactoryOf(GetOperator);

    expect(
      factory(undefined, ctxWith({ session: { operator: sessionOperator } })),
    ).toBe(sessionOperator);
  });

  it('throws instead of returning undefined when there is no session operator', () => {
    const factory = paramFactoryOf(GetOperator);

    expect(() => factory(undefined, ctxWith({ session: {} }))).toThrow(
      AppException,
    );
  });
});
```

- [ ] **Step 8: Run it and watch it fail**

Run: `npx jest src/common/decorators/decorators.spec.ts`

Expected: FAIL — `Cannot find module './get-operator.decorator'`.

- [ ] **Step 9: Implement GetOperator**

Create `src/common/decorators/get-operator.decorator.ts`:

```typescript
import {
  createParamDecorator,
  ExecutionContext,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';

import { ErrorCode } from '../constants/errors';
import { ErrorMessage } from '../constants/messages';
import { AppException } from '../exceptions/app.exception';
import type { OperatorSessionUser } from '../types/operator-session';

/**
 * Intended for routes behind OperatorGuard, which has already rejected any
 * request without a session operator — see GetUser()'s own comment for why
 * this throws rather than returning undefined.
 */
export const GetOperator = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): OperatorSessionUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const operator = request.session?.operator;

    if (!operator) {
      throw new AppException(
        ErrorCode.INTERNAL_SERVER_ERROR,
        ErrorMessage[ErrorCode.INTERNAL_SERVER_ERROR],
        HttpStatus.INTERNAL_SERVER_ERROR,
        { reason: '@GetOperator() used on a route with no authenticated operator session' },
      );
    }

    return operator;
  },
);
```

- [ ] **Step 10: Run it and watch it pass**

Run: `npx jest src/common/decorators/decorators.spec.ts`

Expected: PASS.

- [ ] **Step 11: Add the console-only e2e test fixture**

Create `test/fixtures/console-probe.module.ts`:

```typescript
import { Controller, Get, Module, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { GetOperator } from '../../src/common/decorators/get-operator.decorator';
import { Public } from '../../src/common/decorators/public.decorator';
import { OperatorGuard } from '../../src/common/guards/operator.guard';
import type { OperatorSessionUser } from '../../src/common/types/operator-session';
import { OPERATOR_ID } from '../../prisma/seed-constants';

// Single source of truth for the id is prisma/seed-constants.ts (Task 1).
// The email has no equivalent shared constant (prisma/seed.ts's own default
// is a literal, matching how probe.module.ts hardcodes the household seed's
// admin email) so it is a literal here too.
export const SEED_OPERATOR_ID = OPERATOR_ID;
export const SEED_OPERATOR_EMAIL = 'operator@household.test';

/**
 * E2E-only. Exercises OperatorGuard (and, from Task 3, ActivityRefreshGuard)
 * without depending on the real magic-link flow. Never imported from src/.
 */
@Controller('console-probe')
export class ConsoleProbeController {
  /** Writes session.operator directly, standing in for a real signin. */
  @Post('login')
  @Public()
  login(@Req() request: Request): { ok: true } {
    const now = new Date().toISOString();
    const operator: OperatorSessionUser = {
      id: SEED_OPERATOR_ID,
      email: SEED_OPERATOR_EMAIL,
      role: 'OPERATOR',
      sessionCreatedAt: now,
      lastActivityAt: now,
    };
    request.session.operator = operator;
    return { ok: true };
  }

  @Get('protected')
  @Public()
  @UseGuards(OperatorGuard)
  protected(@GetOperator() operator: OperatorSessionUser): { operatorId: string } {
    return { operatorId: operator.id };
  }
}

@Module({ controllers: [ConsoleProbeController] })
export class ConsoleProbeModule {}
```

- [ ] **Step 12: Register the fixture in the test app**

Edit `test/create-test-app.ts`:

```typescript
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { ConsoleProbeModule } from './fixtures/console-probe.module';
import { ProbeModule } from './fixtures/probe.module';

/**
 * Builds the real application — same module graph, same global guards,
 * filter and interceptors — plus the probe fixtures. configureApp is the same
 * function main.ts calls, so session/CORS/pipe behaviour cannot drift from
 * production.
 */
export async function createTestApp(): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule, ProbeModule, ConsoleProbeModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  return app;
}
```

- [ ] **Step 13: Write the failing e2e test**

Create `test/operator-guards.e2e-spec.ts`:

```typescript
import type { NestExpressApplication } from '@nestjs/platform-express';
import { OperatorStatus } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';

import type { ApiErrorResponse } from '../src/common/types/api-response';
import { PrismaService } from '../src/database/prisma.service';

import { createTestApp } from './create-test-app';
import { SEED_OPERATOR_EMAIL, SEED_OPERATOR_ID } from './fixtures/console-probe.module';

describe('OperatorGuard (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  const server = () => app.getHttpServer() as App;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    await prisma.operator.upsert({
      where: { id: SEED_OPERATOR_ID },
      update: { email: SEED_OPERATOR_EMAIL, status: OperatorStatus.ACTIVE },
      create: {
        id: SEED_OPERATOR_ID,
        email: SEED_OPERATOR_EMAIL,
        status: OperatorStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    await prisma.operator.deleteMany({ where: { id: SEED_OPERATOR_ID } });
    await app.close();
  });

  async function loginAsOperator() {
    const agent = request.agent(server());
    await agent.post('/api/v1/console-probe/login').expect(201);
    return agent;
  }

  it('returns 401 with no session', async () => {
    const response = await request(server())
      .get('/api/v1/console-probe/protected')
      .expect(401);

    expect((response.body as ApiErrorResponse).error.code).toBe('UNAUTHORIZED');
  });

  it('allows an ACTIVE operator', async () => {
    const agent = await loginAsOperator();

    const response = await agent.get('/api/v1/console-probe/protected').expect(200);

    expect(response.body).toEqual({
      success: true,
      data: { operatorId: SEED_OPERATOR_ID },
    });
  });

  it('returns 401 once the operator is deactivated mid-session', async () => {
    const agent = await loginAsOperator();
    await agent.get('/api/v1/console-probe/protected').expect(200);

    await prisma.operator.update({
      where: { id: SEED_OPERATOR_ID },
      data: { status: OperatorStatus.INACTIVE },
    });

    const response = await agent.get('/api/v1/console-probe/protected').expect(401);
    expect((response.body as ApiErrorResponse).error.code).toBe('UNAUTHORIZED');

    // Reset for any test that runs after this one in the same file.
    await prisma.operator.update({
      where: { id: SEED_OPERATOR_ID },
      data: { status: OperatorStatus.ACTIVE },
    });
  });
});
```

- [ ] **Step 14: Run it and watch it fail**

Run: `npx jest --config ./test/jest-e2e.json test/operator-guards.e2e-spec.ts`

Expected: FAIL — the fixture module didn't exist until Step 11, so before that this would
have failed to compile; after Steps 11–12 it should already be passing. If it still fails here,
re-check Step 12's import path.

- [ ] **Step 15: Run it and watch it pass**

Run: `npx jest --config ./test/jest-e2e.json test/operator-guards.e2e-spec.ts`

Expected: PASS, 3 tests. (Requires local Postgres: `npm run db:up && npm run migrate:dev` first
if not already running.)

- [ ] **Step 16: Full verification and commit**

Run: `npm run type-check && npm run lint:ci && npm test`

Expected: all clean.

```bash
git add src/common/types/operator-session.ts src/common/types/express-session.d.ts \
  src/common/guards/operator.guard.ts src/common/guards/operator.guard.spec.ts \
  src/common/decorators/get-operator.decorator.ts src/common/decorators/decorators.spec.ts \
  test/fixtures/console-probe.module.ts test/create-test-app.ts test/operator-guards.e2e-spec.ts
git commit -m "feat(auth): add OperatorGuard, GetOperator and the console session shape"
```

---

### Task 3: ActivityRefreshGuard

**Files:**
- Create: `src/common/guards/activity-refresh.guard.ts`
- Create: `src/common/guards/activity-refresh.guard.spec.ts`
- Modify: `test/fixtures/console-probe.module.ts`
- Modify: `test/operator-guards.e2e-spec.ts`

**Interfaces:**
- Consumes: `OperatorSessionUser` (Task 2).
- Produces: `ActivityRefreshGuard` class, intended to run immediately after `OperatorGuard` in a route's `@UseGuards(OperatorGuard, ActivityRefreshGuard)` list.

- [ ] **Step 1: Write the failing unit test**

Create `src/common/guards/activity-refresh.guard.spec.ts`:

```typescript
import { ExecutionContext } from '@nestjs/common';

import { ActivityRefreshGuard } from './activity-refresh.guard';

function contextFor(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const FOUR_DAYS_MS = 4 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

describe('ActivityRefreshGuard', () => {
  let guard: ActivityRefreshGuard;

  beforeEach(() => {
    guard = new ActivityRefreshGuard();
  });

  it('allows a request with no session.operator, leaving rejection to OperatorGuard', () => {
    const request = { session: {} };

    expect(guard.canActivate(contextFor(request))).toBe(true);
  });

  it('bumps lastActivityAt but leaves cookie.maxAge untouched under the 4-day threshold', () => {
    const cookie: { maxAge?: number } = {};
    const request = {
      session: {
        operator: {
          id: 'op-1',
          email: 'operator@household.test',
          role: 'OPERATOR' as const,
          sessionCreatedAt: new Date(Date.now() - FOUR_DAYS_MS + 60_000).toISOString(),
          lastActivityAt: new Date(Date.now() - FOUR_DAYS_MS + 60_000).toISOString(),
        },
        cookie,
      },
    };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(cookie.maxAge).toBeUndefined();
    expect(Date.now() - new Date(request.session.operator.lastActivityAt).getTime()).toBeLessThan(
      1000,
    );
  });

  it('extends the cookie to 7 days once 4 days have elapsed since last activity', () => {
    const cookie: { maxAge?: number } = {};
    const request = {
      session: {
        operator: {
          id: 'op-1',
          email: 'operator@household.test',
          role: 'OPERATOR' as const,
          sessionCreatedAt: new Date(Date.now() - FOUR_DAYS_MS - 60_000).toISOString(),
          lastActivityAt: new Date(Date.now() - FOUR_DAYS_MS - 60_000).toISOString(),
        },
        cookie,
      },
    };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(cookie.maxAge).toBe(SEVEN_DAYS_MS);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/common/guards/activity-refresh.guard.spec.ts`

Expected: FAIL — `Cannot find module './activity-refresh.guard'`.

- [ ] **Step 3: Implement ActivityRefreshGuard**

Create `src/common/guards/activity-refresh.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

const ACTIVITY_REFRESH_THRESHOLD_MS = 4 * 24 * 60 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Must run after OperatorGuard in the guards list — it trusts that a present
 * session.operator is already known-valid, and simply no-ops (returning true)
 * if one is absent so OperatorGuard remains the single place that rejects.
 *
 * express-session only re-persists a session (and re-sends Set-Cookie) when
 * its content differs from what was loaded — writing lastActivityAt on every
 * request is what makes that happen, and pushing cookie.maxAge forward before
 * that write is what carries a fresh Expires onto the response.
 */
@Injectable()
export class ActivityRefreshGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const operator = request.session?.operator;

    if (!operator) {
      return true;
    }

    const elapsedMs = Date.now() - new Date(operator.lastActivityAt).getTime();
    if (elapsedMs >= ACTIVITY_REFRESH_THRESHOLD_MS) {
      request.session.cookie.maxAge = SESSION_TTL_MS;
    }

    request.session.operator = {
      ...operator,
      lastActivityAt: new Date().toISOString(),
    };

    return true;
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx jest src/common/guards/activity-refresh.guard.spec.ts`

Expected: PASS, 3 tests.

- [ ] **Step 5: Wire it into the console probe fixture's protected route**

Edit `test/fixtures/console-probe.module.ts`. Add the import:

```typescript
import { ActivityRefreshGuard } from '../../src/common/guards/activity-refresh.guard';
```

Change the `protected()` handler's guard list:

```typescript
  @Get('protected')
  @Public()
  @UseGuards(OperatorGuard, ActivityRefreshGuard)
  protected(@GetOperator() operator: OperatorSessionUser): { operatorId: string } {
    return { operatorId: operator.id };
  }
```

- [ ] **Step 6: Add an e2e test proving the session row is actually extended**

Edit `test/operator-guards.e2e-spec.ts`. Add this import:

```typescript
import { SESSION_COOKIE_NAME } from '../src/config/session.config';
```

Add these two local helpers near the top of the file, after the existing imports (the same
approach `test/session.e2e-spec.ts` already uses to get from a signed cookie to the `session`
table's primary key):

```typescript
function asArray(header: string | string[] | undefined): string[] {
  if (!header) {
    return [];
  }
  return Array.isArray(header) ? header : [header];
}

function sidFromCookie(cookie: string): string {
  const rawValue = decodeURIComponent(
    cookie.split(';')[0].split('=').slice(1).join('='),
  );
  const withoutSignaturePrefix = rawValue.startsWith('s:')
    ? rawValue.slice(2)
    : rawValue;
  return withoutSignaturePrefix.split('.')[0];
}
```

Add a new test inside the `describe('OperatorGuard (e2e)', ...)` block. It logs in directly
(rather than via the shared `loginAsOperator()` helper) so it can capture the login response's
`Set-Cookie` header — guaranteed present because the session is brand new at that point, unlike
on a later request where whether express-session re-sends `Set-Cookie` depends on whether the
session content changed:

```typescript
  it('extends the session cookie once 4 days of inactivity have passed', async () => {
    const agent = request.agent(server());
    const loginResponse = await agent.post('/api/v1/console-probe/login').expect(201);
    const sessionCookie = asArray(loginResponse.headers['set-cookie']).find((c) =>
      c.startsWith(`${SESSION_COOKIE_NAME}=`),
    );
    expect(sessionCookie).toBeDefined();
    const sid = sidFromCookie(sessionCookie as string);

    // Directly age the session row's lastActivityAt past the 4-day
    // threshold — there is no way to fast-forward real time in an e2e test.
    const rows = await prisma.$queryRaw<{ sess: { operator?: Record<string, unknown> } }[]>`
      SELECT sess FROM session WHERE sid = ${sid}
    `;
    expect(rows).toHaveLength(1);

    const staleActivity = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const updatedSess = {
      ...rows[0].sess,
      operator: { ...rows[0].sess.operator, lastActivityAt: staleActivity },
    };
    await prisma.$executeRaw`
      UPDATE session SET sess = ${JSON.stringify(updatedSess)}::json WHERE sid = ${sid}
    `;

    const refreshed = await agent.get('/api/v1/console-probe/protected').expect(200);
    const refreshedCookie = asArray(refreshed.headers['set-cookie']).find((c) =>
      c.startsWith(`${SESSION_COOKIE_NAME}=`),
    );
    expect(refreshedCookie).toBeDefined();
    expect(refreshedCookie).toMatch(/Expires=/i);
  });
```

- [ ] **Step 7: Run it and watch it pass**

Run: `npx jest --config ./test/jest-e2e.json test/operator-guards.e2e-spec.ts`

Expected: PASS, 4 tests. If the new test is flaky on `Expires=` matching, confirm
`buildSessionMiddleware`'s cookie config still sets `maxAge` (it does, unconditionally) — every
Set-Cookie from express-session carries an `Expires` attribute derived from it, so this assertion
holds regardless of whether this specific request was the one that pushed `maxAge` forward.

- [ ] **Step 8: Full verification and commit**

Run: `npm run type-check && npm run lint:ci && npm test`

```bash
git add src/common/guards/activity-refresh.guard.ts src/common/guards/activity-refresh.guard.spec.ts \
  test/fixtures/console-probe.module.ts test/operator-guards.e2e-spec.ts
git commit -m "feat(auth): add ActivityRefreshGuard"
```

---

### Task 4: Email module — EmailService, ConsoleEmailService, ResendEmailService

**Files:**
- Create: `src/email/email.interface.ts`
- Create: `src/email/console-email.service.ts`
- Create: `src/email/console-email.service.spec.ts`
- Create: `src/email/resend-email.service.ts`
- Create: `src/email/resend-email.service.spec.ts`
- Create: `src/email/email.config.ts`
- Create: `src/email/email.config.spec.ts`
- Create: `src/email/email.module.ts`
- Modify: `src/config/env.validation.ts`
- Modify: `src/config/env.validation.spec.ts`
- Modify: `.env.example`
- Modify: `package.json` (new dependency: `resend`)

**Interfaces:**
- Produces: `EmailService` interface (`send(params: SendEmailParams): Promise<void>`), `SendEmailParams { to: string; subject: string; html: string; text: string }`, `EMAIL_SERVICE` DI token (string), `ConsoleEmailService`, `ResendEmailService`, `createEmailService(config): EmailService`, `EmailModule` (`@Global()`, exports `EMAIL_SERVICE`).
- Produces env vars: `RESEND_API_KEY?: string`, `EMAIL_FROM_ADDRESS: string` (defaulted).

- [ ] **Step 1: Add the new dependency**

Run: `npm install resend@^6.18.1`

Expected: `package.json`'s `dependencies` gains `"resend": "^6.18.1"`, `package-lock.json` updates.

- [ ] **Step 2: Add the env vars**

Edit `src/config/env.validation.ts`. Add these imports to the existing `class-validator` import:

```typescript
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';
```

Add fields to `EnvironmentVariables`, after `THROTTLE_LIMIT`:

```typescript
  /** Unset in development/test falls back to logging emails instead of sending them (see EmailModule). Required in production — see the check below. */
  @IsOptional()
  @IsString()
  RESEND_API_KEY?: string;

  @IsString()
  @MinLength(1)
  EMAIL_FROM_ADDRESS: string = 'NOSTOS Console <console@nostos.local>';
```

Add a production check alongside the existing `SESSION_SECRET` one, inside `validate()`:

```typescript
  if (
    validated.NODE_ENV === NodeEnv.Production &&
    (validated.RESEND_API_KEY === undefined || validated.RESEND_API_KEY.length === 0)
  ) {
    throw new Error(
      'Invalid environment configuration:\n  - RESEND_API_KEY: required in production (no email fallback outside dev/test)',
    );
  }
```

- [ ] **Step 3: Write the failing env validation tests**

Edit `src/config/env.validation.spec.ts`. Add after the existing `'rejects the dev SESSION_SECRET in production'` test:

```typescript
  it('rejects a missing RESEND_API_KEY in production', () => {
    expect(() =>
      validate({ ...valid, NODE_ENV: 'production', SESSION_SECRET: 'a'.repeat(48) }),
    ).toThrow(/RESEND_API_KEY/);
  });

  it('accepts a missing RESEND_API_KEY outside production', () => {
    const config = validate(valid);

    expect(config.RESEND_API_KEY).toBeUndefined();
    expect(config.EMAIL_FROM_ADDRESS).toBe('NOSTOS Console <console@nostos.local>');
  });

  it('accepts production with a RESEND_API_KEY set', () => {
    const config = validate({
      ...valid,
      NODE_ENV: 'production',
      SESSION_SECRET: 'a'.repeat(48),
      RESEND_API_KEY: 're_test_key',
    });

    expect(config.RESEND_API_KEY).toBe('re_test_key');
  });
```

- [ ] **Step 4: Run it and watch it fail**

Run: `npx jest src/config/env.validation.spec.ts`

Expected: FAIL on the new `'rejects a missing RESEND_API_KEY in production'` case (it won't
throw yet since Step 2 above hasn't been applied — apply Step 2 first if you're following strict
red-green per test; both edits are small enough to have been made together, in which case this
step should already pass and Step 5 is a no-op check).

- [ ] **Step 5: Run it and watch it pass**

Run: `npx jest src/config/env.validation.spec.ts`

Expected: PASS, all cases including the 3 new ones.

- [ ] **Step 6: Add the env example entries**

Edit `.env.example`, adding a new section after `# ---- Rate limiting ----`:

```
# ---- Email (Resend) ----
# Optional in development/test: omitting it falls back to logging emails via
# winston instead of sending them (see src/email/email.config.ts). Startup
# FAILS in production if left unset — see src/config/env.validation.ts.
RESEND_API_KEY=
EMAIL_FROM_ADDRESS="NOSTOS Console <console@nostos.local>"
```

- [ ] **Step 7: Define the EmailService interface and token**

Create `src/email/email.interface.ts`:

```typescript
export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailService {
  send(params: SendEmailParams): Promise<void>;
}

export const EMAIL_SERVICE = 'EMAIL_SERVICE';
```

- [ ] **Step 8: Write the failing ConsoleEmailService test**

Create `src/email/console-email.service.spec.ts`:

```typescript
import { Logger } from '@nestjs/common';

import { ConsoleEmailService } from './console-email.service';

describe('ConsoleEmailService', () => {
  it('resolves without throwing and logs the recipient and subject', async () => {
    const logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const service = new ConsoleEmailService();

    await expect(
      service.send({
        to: 'operator@household.test',
        subject: 'Sign in to NOSTOS Operator Console',
        html: '<p>link</p>',
        text: 'link',
      }),
    ).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('operator@household.test'),
    );
    logSpy.mockRestore();
  });
});
```

- [ ] **Step 9: Run it and watch it fail**

Run: `npx jest src/email/console-email.service.spec.ts`

Expected: FAIL — `Cannot find module './console-email.service'`.

- [ ] **Step 10: Implement ConsoleEmailService**

Create `src/email/console-email.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';

import type { EmailService, SendEmailParams } from './email.interface';

/**
 * Dev/test-safe fallback used whenever RESEND_API_KEY is unset (see
 * email.config.ts). Never sends real mail — logs enough to manually copy a
 * magic link out of the terminal during local development.
 */
@Injectable()
export class ConsoleEmailService implements EmailService {
  private readonly logger = new Logger(ConsoleEmailService.name);

  send(params: SendEmailParams): Promise<void> {
    this.logger.log(
      `Email suppressed (no RESEND_API_KEY configured) — to=${params.to} subject="${params.subject}"\n${params.text}`,
    );
    return Promise.resolve();
  }
}
```

- [ ] **Step 11: Run it and watch it pass**

Run: `npx jest src/email/console-email.service.spec.ts`

Expected: PASS.

- [ ] **Step 12: Write the failing ResendEmailService test**

Create `src/email/resend-email.service.spec.ts`:

```typescript
import type { Resend } from 'resend';

import { ResendEmailService } from './resend-email.service';

describe('ResendEmailService', () => {
  const params = {
    to: 'operator@household.test',
    subject: 'Sign in to NOSTOS Operator Console',
    html: '<p>link</p>',
    text: 'link',
  };

  it('sends via the Resend client with the configured from address', async () => {
    const send = jest.fn().mockResolvedValue({ data: { id: 'email_1' }, error: null });
    const client = { emails: { send } } as unknown as Resend;

    const service = new ResendEmailService(client, 'NOSTOS Console <console@nostos.local>');
    await service.send(params);

    expect(send).toHaveBeenCalledWith({
      from: 'NOSTOS Console <console@nostos.local>',
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
  });

  it('throws when Resend reports an error', async () => {
    const send = jest.fn().mockResolvedValue({
      data: null,
      error: { message: 'invalid_from_address', statusCode: 422, name: 'invalid_from_address' },
    });
    const client = { emails: { send } } as unknown as Resend;

    const service = new ResendEmailService(client, 'NOSTOS Console <console@nostos.local>');

    await expect(service.send(params)).rejects.toThrow(/invalid_from_address/);
  });
});
```

- [ ] **Step 13: Run it and watch it fail**

Run: `npx jest src/email/resend-email.service.spec.ts`

Expected: FAIL — `Cannot find module './resend-email.service'`.

- [ ] **Step 14: Implement ResendEmailService**

Create `src/email/resend-email.service.ts`:

```typescript
import type { Resend } from 'resend';

import type { EmailService, SendEmailParams } from './email.interface';

/**
 * Takes the Resend client as a constructor argument (rather than
 * constructing `new Resend(apiKey)` internally) purely so it can be
 * unit-tested with a fake client — see resend-email.service.spec.ts.
 */
export class ResendEmailService implements EmailService {
  constructor(
    private readonly client: Resend,
    private readonly fromAddress: string,
  ) {}

  async send(params: SendEmailParams): Promise<void> {
    const result = await this.client.emails.send({
      from: this.fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (result.error) {
      throw new Error(`Resend send failed: ${result.error.message}`);
    }
  }
}
```

- [ ] **Step 15: Run it and watch it pass**

Run: `npx jest src/email/resend-email.service.spec.ts`

Expected: PASS, 2 tests.

- [ ] **Step 16: Write the failing factory test**

Create `src/email/email.config.ts` test first — create `src/email/email.config.spec.ts`:

```typescript
import type { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../config/env.validation';
import { ConsoleEmailService } from './console-email.service';
import { createEmailService } from './email.config';
import { ResendEmailService } from './resend-email.service';

function fakeConfig(values: Partial<EnvironmentVariables>): ConfigService<EnvironmentVariables, true> {
  return {
    get: (key: string) => (values as Record<string, unknown>)[key],
  } as unknown as ConfigService<EnvironmentVariables, true>;
}

describe('createEmailService', () => {
  it('returns ConsoleEmailService when RESEND_API_KEY is unset', () => {
    const service = createEmailService(fakeConfig({ EMAIL_FROM_ADDRESS: 'a@b.com' }));

    expect(service).toBeInstanceOf(ConsoleEmailService);
  });

  it('returns ResendEmailService when RESEND_API_KEY is set', () => {
    const service = createEmailService(
      fakeConfig({ RESEND_API_KEY: 're_test', EMAIL_FROM_ADDRESS: 'a@b.com' }),
    );

    expect(service).toBeInstanceOf(ResendEmailService);
  });
});
```

- [ ] **Step 17: Run it and watch it fail**

Run: `npx jest src/email/email.config.spec.ts`

Expected: FAIL — `Cannot find module './email.config'`.

- [ ] **Step 18: Implement the factory**

Create `src/email/email.config.ts`:

```typescript
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

import type { EnvironmentVariables } from '../config/env.validation';
import { ConsoleEmailService } from './console-email.service';
import type { EmailService } from './email.interface';
import { ResendEmailService } from './resend-email.service';

export function createEmailService(
  config: ConfigService<EnvironmentVariables, true>,
): EmailService {
  const apiKey = config.get('RESEND_API_KEY', { infer: true });

  if (!apiKey) {
    return new ConsoleEmailService();
  }

  const fromAddress = config.get('EMAIL_FROM_ADDRESS', { infer: true });
  return new ResendEmailService(new Resend(apiKey), fromAddress);
}
```

- [ ] **Step 19: Run it and watch it pass**

Run: `npx jest src/email/email.config.spec.ts`

Expected: PASS, 2 tests.

- [ ] **Step 20: Wire the DI module**

Create `src/email/email.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../config/env.validation';
import { createEmailService } from './email.config';
import { EMAIL_SERVICE } from './email.interface';

/**
 * @Global() so every feature module (console-auth now, household management
 * later) gets EMAIL_SERVICE without re-importing this module — same pattern
 * as PrismaModule.
 */
@Global()
@Module({
  providers: [
    {
      provide: EMAIL_SERVICE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        createEmailService(config),
    },
  ],
  exports: [EMAIL_SERVICE],
})
export class EmailModule {}
```

- [ ] **Step 21: Register EmailModule in AppModule**

Edit `src/app.module.ts`. Add the import:

```typescript
import { EmailModule } from './email/email.module';
```

Add `EmailModule` to the `imports` array, after `PrismaModule`:

```typescript
    PrismaModule,
    EmailModule,
    HealthModule,
```

- [ ] **Step 22: Full verification and commit**

Run: `npm run type-check && npm run lint:ci && npm test`

Expected: all clean. (`npm test` alone re-runs every spec including the ones from this task.)

```bash
git add package.json package-lock.json src/config/env.validation.ts src/config/env.validation.spec.ts \
  .env.example src/email src/app.module.ts
git commit -m "feat(email): add EmailService with a Resend and console-log implementation"
```

---

### Task 5: Operator signin email template

**Files:**
- Create: `src/email/templates/operator-signin.template.ts`
- Create: `src/email/templates/operator-signin.template.spec.ts`

**Interfaces:**
- Produces: `buildOperatorSigninEmail(magicLink: string): { subject: string; html: string; text: string }`.

- [ ] **Step 1: Write the failing test**

Create `src/email/templates/operator-signin.template.spec.ts`:

```typescript
import { buildOperatorSigninEmail } from './operator-signin.template';

describe('buildOperatorSigninEmail', () => {
  it('includes the magic link and a 15-minute expiry notice in both bodies', () => {
    const magicLink = 'https://console.nostos.test/console/auth/signin/abc123';

    const email = buildOperatorSigninEmail(magicLink);

    expect(email.subject).toBe('Sign in to NOSTOS Operator Console');
    expect(email.html).toContain(magicLink);
    expect(email.html).toContain('15 minutes');
    expect(email.text).toContain(magicLink);
    expect(email.text).toContain('15 minutes');
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/email/templates/operator-signin.template.spec.ts`

Expected: FAIL — `Cannot find module './operator-signin.template'`.

- [ ] **Step 3: Implement the template**

Create `src/email/templates/operator-signin.template.ts`:

```typescript
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const SIGNIN_LINK_TTL_LABEL = '15 minutes';

export function buildOperatorSigninEmail(magicLink: string): EmailContent {
  const subject = 'Sign in to NOSTOS Operator Console';

  const text = [
    'Sign in to the NOSTOS Operator Console:',
    '',
    magicLink,
    '',
    `This link expires in ${SIGNIN_LINK_TTL_LABEL}. If you did not request this, you can ignore this email.`,
  ].join('\n');

  const html = [
    '<p>Sign in to the NOSTOS Operator Console:</p>',
    `<p><a href="${magicLink}">${magicLink}</a></p>`,
    `<p>This link expires in ${SIGNIN_LINK_TTL_LABEL}. If you did not request this, you can ignore this email.</p>`,
  ].join('\n');

  return { subject, html, text };
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx jest src/email/templates/operator-signin.template.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/email/templates/operator-signin.template.ts src/email/templates/operator-signin.template.spec.ts
git commit -m "feat(email): add the operator signin email template"
```

---

### Task 6: Audit log module

**Files:**
- Create: `src/audit/audit-log.service.ts`
- Create: `src/audit/audit-log.service.spec.ts`
- Create: `src/audit/audit-log.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `PrismaService` (`prisma.operatorAuditLog.create`, Task 1's schema).
- Produces: `RecordAuditLogEntry { operatorId?: string; action: string; householdId?: string; details?: Prisma.InputJsonObject; ipAddress?: string; userAgent?: string }`, `AuditLogService.record(entry): Promise<void>`, `AuditLogModule` (`@Global()`, exports `AuditLogService`).

- [ ] **Step 1: Write the failing test**

Create `src/audit/audit-log.service.spec.ts`:

```typescript
import type { PrismaService } from '../database/prisma.service';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  it('inserts an operator_audit_logs row with the given fields', async () => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = { operatorAuditLog: { create } };

    const service = new AuditLogService(prisma as unknown as PrismaService);

    await service.record({
      operatorId: 'op-1',
      action: 'SIGNIN',
      details: { email: 'operator@household.test', success: true },
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        operatorId: 'op-1',
        action: 'SIGNIN',
        householdId: undefined,
        details: { email: 'operator@household.test', success: true },
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/audit/audit-log.service.spec.ts`

Expected: FAIL — `Cannot find module './audit-log.service'`.

- [ ] **Step 3: Implement AuditLogService**

Create `src/audit/audit-log.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface RecordAuditLogEntry {
  operatorId?: string;
  action: string;
  householdId?: string;
  details?: Prisma.InputJsonObject;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: RecordAuditLogEntry): Promise<void> {
    await this.prisma.operatorAuditLog.create({
      data: {
        operatorId: entry.operatorId,
        action: entry.action,
        householdId: entry.householdId,
        details: entry.details,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
    });
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx jest src/audit/audit-log.service.spec.ts`

Expected: PASS.

- [ ] **Step 5: Wire the DI module**

Create `src/audit/audit-log.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';

import { AuditLogService } from './audit-log.service';

@Global()
@Module({
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}
```

- [ ] **Step 6: Register it in AppModule**

Edit `src/app.module.ts`. Add the import:

```typescript
import { AuditLogModule } from './audit/audit-log.module';
```

Add it to `imports`, after `EmailModule`:

```typescript
    PrismaModule,
    EmailModule,
    AuditLogModule,
    HealthModule,
```

- [ ] **Step 7: Full verification and commit**

Run: `npm run type-check && npm run lint:ci && npm test`

```bash
git add src/audit src/app.module.ts
git commit -m "feat(audit): add AuditLogService"
```

---

### Task 7: POST /console/auth/signin

**Files:**
- Create: `src/console-auth/dto/signin-request.dto.ts`
- Create: `src/console-auth/console-auth.service.ts`
- Create: `src/console-auth/console-auth.service.spec.ts`
- Create: `src/console-auth/console-auth.controller.ts`
- Create: `src/console-auth/console-auth.module.ts`
- Modify: `src/app.module.ts`
- Create: `test/fixtures/fake-email.service.ts`
- Modify: `test/create-test-app.ts`
- Create: `test/console-auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `EMAIL_SERVICE`/`EmailService` (Task 4), `buildOperatorSigninEmail` (Task 5), `AuditLogService` (Task 6), `PrismaService`/`Operator`/`Invite`/`InviteTokenType`/`OperatorStatus` (Task 1).
- Produces: `ConsoleAuthService.requestSignin(rawEmail: string): Promise<{ email: string }>`; `POST /api/v1/console/auth/signin`; `test/fixtures/fake-email.service.ts` exporting `FakeEmailService`; `createTestApp(configureModule?)` gains an optional override hook.

- [ ] **Step 1: Add the request DTO**

Create `src/console-auth/dto/signin-request.dto.ts`:

```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class SigninRequestDto {
  @ApiProperty({ example: 'operator@nostos.com' })
  @IsEmail()
  email: string;
}
```

- [ ] **Step 2: Give `createTestApp` an optional override hook**

Edit `test/create-test-app.ts`:

```typescript
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModuleBuilder } from '@nestjs/testing';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';
import { ConsoleProbeModule } from './fixtures/console-probe.module';
import { ProbeModule } from './fixtures/probe.module';

/**
 * Builds the real application — same module graph, same global guards,
 * filter and interceptors — plus the probe fixtures. configureApp is the same
 * function main.ts calls, so session/CORS/pipe behaviour cannot drift from
 * production.
 *
 * `configureModule` lets a spec override a provider (e.g. swapping the real
 * EMAIL_SERVICE for a FakeEmailService) before the module compiles. Existing
 * callers that don't need this keep working unchanged.
 */
export async function createTestApp(
  configureModule?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<NestExpressApplication> {
  let builder = Test.createTestingModule({
    imports: [AppModule, ProbeModule, ConsoleProbeModule],
  });

  if (configureModule) {
    builder = configureModule(builder);
  }

  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();

  return app;
}
```

- [ ] **Step 3: Add the fake email test double**

Create `test/fixtures/fake-email.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';

import type { EmailService, SendEmailParams } from '../../src/email/email.interface';

/**
 * Test-only. Captures every send() call in memory instead of touching the
 * real Resend API, and lets specs extract a magic-link token out of the
 * captured HTML body — see extractSigninToken() below.
 */
@Injectable()
export class FakeEmailService implements EmailService {
  readonly sent: SendEmailParams[] = [];

  send(params: SendEmailParams): Promise<void> {
    this.sent.push(params);
    return Promise.resolve();
  }

  reset(): void {
    this.sent.length = 0;
  }
}

const SIGNIN_TOKEN_PATTERN = /\/console\/auth\/signin\/([a-f0-9]{64})/;

export function extractSigninToken(email: SendEmailParams): string {
  const match = SIGNIN_TOKEN_PATTERN.exec(email.html);
  if (!match) {
    throw new Error('signin link not found in captured email body');
  }
  return match[1];
}
```

- [ ] **Step 4: Write the failing service test**

Create `src/console-auth/console-auth.service.spec.ts`:

```typescript
import { ConfigService } from '@nestjs/config';
import { InviteTokenType, OperatorStatus } from '@prisma/client';

import type { AuditLogService } from '../audit/audit-log.service';
import { AppException } from '../common/exceptions/app.exception';
import type { EnvironmentVariables } from '../config/env.validation';
import type { PrismaService } from '../database/prisma.service';
import type { EmailService } from '../email/email.interface';
import { ConsoleAuthService } from './console-auth.service';

const OPERATOR = {
  id: 'op-1',
  email: 'operator@household.test',
  status: OperatorStatus.ACTIVE,
  createdAt: new Date(),
  lastLoginAt: null,
};

function buildService(overrides?: {
  operatorFindUnique?: jest.Mock;
  inviteCount?: jest.Mock;
  inviteCreate?: jest.Mock;
}) {
  const prisma = {
    operator: {
      findUnique: overrides?.operatorFindUnique ?? jest.fn().mockResolvedValue(OPERATOR),
    },
    invite: {
      count: overrides?.inviteCount ?? jest.fn().mockResolvedValue(0),
      create: overrides?.inviteCreate ?? jest.fn().mockResolvedValue({}),
    },
  };
  const auditLog = { record: jest.fn().mockResolvedValue(undefined) };
  const emailService: EmailService = { send: jest.fn().mockResolvedValue(undefined) };
  const config = {
    get: (key: string) =>
      ({ FRONTEND_URL: 'https://console.nostos.test' })[key],
  } as unknown as ConfigService<EnvironmentVariables, true>;

  const service = new ConsoleAuthService(
    prisma as unknown as PrismaService,
    auditLog as unknown as AuditLogService,
    config,
    emailService,
  );

  return { service, prisma, auditLog, emailService };
}

describe('ConsoleAuthService.requestSignin', () => {
  it('normalises the email, sends a signin email, and returns it', async () => {
    const { service, emailService } = buildService();

    const result = await service.requestSignin('  Operator@Household.TEST  ');

    expect(result).toEqual({ email: 'operator@household.test' });
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'operator@household.test' }),
    );
  });

  it('creates an OPERATOR_SIGNIN invite with a 15-minute expiry', async () => {
    const inviteCreate = jest.fn().mockResolvedValue({});
    const { service } = buildService({ inviteCreate });

    const before = Date.now();
    await service.requestSignin('operator@household.test');
    const after = Date.now();

    expect(inviteCreate).toHaveBeenCalledTimes(1);
    const call = inviteCreate.mock.calls[0][0] as {
      data: { email: string; tokenType: InviteTokenType; expiresAt: Date };
    };
    expect(call.data.email).toBe('operator@household.test');
    expect(call.data.tokenType).toBe(InviteTokenType.OPERATOR_SIGNIN);
    const expiresInMs = call.data.expiresAt.getTime() - before;
    expect(expiresInMs).toBeGreaterThanOrEqual(15 * 60 * 1000 - 1000);
    expect(expiresInMs).toBeLessThanOrEqual(15 * 60 * 1000 + (after - before) + 1000);
  });

  it('throws 401 without revealing whether the email exists', async () => {
    const { service } = buildService({
      operatorFindUnique: jest.fn().mockResolvedValue(null),
    });

    await expect(service.requestSignin('nobody@household.test')).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Email not authorized to access console',
    });
  });

  it('throws 401 for an INACTIVE operator', async () => {
    const { service } = buildService({
      operatorFindUnique: jest
        .fn()
        .mockResolvedValue({ ...OPERATOR, status: OperatorStatus.INACTIVE }),
    });

    await expect(service.requestSignin('operator@household.test')).rejects.toBeInstanceOf(
      AppException,
    );
  });

  it('throws 429 after 5 recent signin attempts for the same email', async () => {
    const { service } = buildService({ inviteCount: jest.fn().mockResolvedValue(5) });

    await expect(service.requestSignin('operator@household.test')).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many signin attempts. Try again in 1 hour.',
    });
  });
});
```

- [ ] **Step 5: Run it and watch it fail**

Run: `npx jest src/console-auth/console-auth.service.spec.ts`

Expected: FAIL — `Cannot find module './console-auth.service'`.

- [ ] **Step 6: Implement ConsoleAuthService (signin request only)**

Create `src/console-auth/console-auth.service.ts`:

```typescript
import { createHash, randomBytes } from 'node:crypto';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InviteTokenType, OperatorStatus } from '@prisma/client';

import { AuditLogService } from '../audit/audit-log.service';
import { ErrorCode } from '../common/constants/errors';
import { AppException } from '../common/exceptions/app.exception';
import type { EnvironmentVariables } from '../config/env.validation';
import { PrismaService } from '../database/prisma.service';
import { EMAIL_SERVICE } from '../email/email.interface';
import type { EmailService } from '../email/email.interface';
import { buildOperatorSigninEmail } from '../email/templates/operator-signin.template';

const SIGNIN_TOKEN_BYTES = 32;
const SIGNIN_TOKEN_TTL_MS = 15 * 60 * 1000;
const SIGNIN_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const SIGNIN_RATE_LIMIT_MAX_ATTEMPTS = 5;

function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

@Injectable()
export class ConsoleAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    @Inject(EMAIL_SERVICE) private readonly emailService: EmailService,
  ) {}

  async requestSignin(rawEmail: string): Promise<{ email: string }> {
    const email = rawEmail.trim().toLowerCase();

    const operator = await this.prisma.operator.findUnique({ where: { email } });
    if (!operator || operator.status !== OperatorStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.UNAUTHORIZED,
        'Email not authorized to access console',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const windowStart = new Date(Date.now() - SIGNIN_RATE_LIMIT_WINDOW_MS);
    const recentAttempts = await this.prisma.invite.count({
      where: {
        email,
        tokenType: InviteTokenType.OPERATOR_SIGNIN,
        createdAt: { gte: windowStart },
      },
    });
    if (recentAttempts >= SIGNIN_RATE_LIMIT_MAX_ATTEMPTS) {
      throw new AppException(
        ErrorCode.TOO_MANY_REQUESTS,
        'Too many signin attempts. Try again in 1 hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const rawToken = randomBytes(SIGNIN_TOKEN_BYTES).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + SIGNIN_TOKEN_TTL_MS);

    await this.prisma.invite.create({
      data: { email, tokenType: InviteTokenType.OPERATOR_SIGNIN, tokenHash, expiresAt },
    });

    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    const magicLink = `${frontendUrl}/console/auth/signin/${rawToken}`;
    const template = buildOperatorSigninEmail(magicLink);
    await this.emailService.send({ to: email, ...template });

    return { email };
  }
}
```

- [ ] **Step 7: Run it and watch it pass**

Run: `npx jest src/console-auth/console-auth.service.spec.ts`

Expected: PASS, 5 tests.

- [ ] **Step 8: Add the controller**

Create `src/console-auth/console-auth.controller.ts`:

```typescript
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ConsoleAuthService } from './console-auth.service';
import { SigninRequestDto } from './dto/signin-request.dto';

@Controller('console/auth')
export class ConsoleAuthController {
  constructor(private readonly consoleAuthService: ConsoleAuthService) {}

  @Post('signin')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Check your email for a signin link')
  async signin(@Body() body: SigninRequestDto): Promise<{ email: string }> {
    return this.consoleAuthService.requestSignin(body.email);
  }
}
```

- [ ] **Step 9: Add the module and register it**

Create `src/console-auth/console-auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';

import { ConsoleAuthController } from './console-auth.controller';
import { ConsoleAuthService } from './console-auth.service';

@Module({
  controllers: [ConsoleAuthController],
  providers: [ConsoleAuthService],
})
export class ConsoleAuthModule {}
```

Edit `src/app.module.ts`. Add the import:

```typescript
import { ConsoleAuthModule } from './console-auth/console-auth.module';
```

Add it to `imports`, after `HealthModule`:

```typescript
    PrismaModule,
    EmailModule,
    AuditLogModule,
    HealthModule,
    ConsoleAuthModule,
```

- [ ] **Step 10: Write the failing e2e test**

Create `test/console-auth.e2e-spec.ts`:

```typescript
import type { NestExpressApplication } from '@nestjs/platform-express';
import { OperatorStatus } from '@prisma/client';
import request from 'supertest';
import type { App } from 'supertest/types';

import type { ApiErrorResponse } from '../src/common/types/api-response';
import { PrismaService } from '../src/database/prisma.service';
import { EMAIL_SERVICE } from '../src/email/email.interface';

import { createTestApp } from './create-test-app';
import { SEED_OPERATOR_EMAIL, SEED_OPERATOR_ID } from './fixtures/console-probe.module';
import { FakeEmailService } from './fixtures/fake-email.service';

describe('console auth (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let fakeEmailService: FakeEmailService;

  const server = () => app.getHttpServer() as App;

  beforeAll(async () => {
    fakeEmailService = new FakeEmailService();
    app = await createTestApp((builder) =>
      builder.overrideProvider(EMAIL_SERVICE).useValue(fakeEmailService),
    );
    prisma = app.get(PrismaService);

    await prisma.operator.upsert({
      where: { id: SEED_OPERATOR_ID },
      update: { email: SEED_OPERATOR_EMAIL, status: OperatorStatus.ACTIVE },
      create: {
        id: SEED_OPERATOR_ID,
        email: SEED_OPERATOR_EMAIL,
        status: OperatorStatus.ACTIVE,
      },
    });
  });

  afterAll(async () => {
    await prisma.operatorAuditLog.deleteMany({ where: { operatorId: SEED_OPERATOR_ID } });
    await prisma.invite.deleteMany({ where: { email: SEED_OPERATOR_EMAIL } });
    await prisma.operator.deleteMany({ where: { id: SEED_OPERATOR_ID } });
    await app.close();
  });

  beforeEach(() => {
    fakeEmailService.reset();
  });

  afterEach(async () => {
    await prisma.invite.deleteMany({ where: { email: SEED_OPERATOR_EMAIL } });
  });

  describe('POST /console/auth/signin', () => {
    it('sends a signin link and returns 200 for an active operator email', async () => {
      const response = await request(server())
        .post('/api/v1/console/auth/signin')
        .send({ email: SEED_OPERATOR_EMAIL })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { email: SEED_OPERATOR_EMAIL },
        message: 'Check your email for a signin link',
      });
      expect(fakeEmailService.sent).toHaveLength(1);
      expect(fakeEmailService.sent[0].to).toBe(SEED_OPERATOR_EMAIL);
    });

    it('returns 401 without revealing whether the email exists', async () => {
      const response = await request(server())
        .post('/api/v1/console/auth/signin')
        .send({ email: 'nobody@household.test' })
        .expect(401);

      expect((response.body as ApiErrorResponse).error).toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Email not authorized to access console',
      });
      expect(fakeEmailService.sent).toHaveLength(0);
    });

    it('returns 400 for a malformed email', async () => {
      await request(server())
        .post('/api/v1/console/auth/signin')
        .send({ email: 'not-an-email' })
        .expect(400);
    });

    it('returns 429 after 5 signin requests for the same email within an hour', async () => {
      for (let i = 0; i < 5; i++) {
        await request(server())
          .post('/api/v1/console/auth/signin')
          .send({ email: SEED_OPERATOR_EMAIL })
          .expect(200);
      }

      const response = await request(server())
        .post('/api/v1/console/auth/signin')
        .send({ email: SEED_OPERATOR_EMAIL })
        .expect(429);

      expect((response.body as ApiErrorResponse).error).toMatchObject({
        code: 'TOO_MANY_REQUESTS',
        message: 'Too many signin attempts. Try again in 1 hour.',
      });
    });
  });
});
```

- [ ] **Step 11: Run it and watch it fail, then pass**

Run: `npx jest --config ./test/jest-e2e.json test/console-auth.e2e-spec.ts`

Expected: after Steps 1–9 are all in place this should already PASS, 4 tests. If it fails on the
429 case, confirm `THROTTLE_LIMIT=15` from `test/load-test-env.ts` is comfortably above 6 requests
per test (it is) so this isn't tripping the *global* throttler instead of the intended
email-scoped one.

- [ ] **Step 12: Full verification and commit**

Run: `npm run type-check && npm run lint:ci && npm test && npm run test:e2e`

```bash
git add src/console-auth test/fixtures/fake-email.service.ts test/create-test-app.ts \
  test/console-auth.e2e-spec.ts src/app.module.ts
git commit -m "feat(auth): add POST /console/auth/signin"
```

---

### Task 8: GET /console/auth/signin/:token

**Files:**
- Modify: `src/console-auth/console-auth.service.ts`
- Modify: `src/console-auth/console-auth.service.spec.ts`
- Modify: `src/console-auth/console-auth.controller.ts`
- Modify: `test/console-auth.e2e-spec.ts`

**Interfaces:**
- Consumes: everything from Task 7, plus `express`'s `Request`/`Response` types.
- Produces: `ConsoleAuthService.consumeSigninToken(rawToken: string, request: Request): Promise<string>` (returns the redirect URL); `GET /api/v1/console/auth/signin/:token`.

- [ ] **Step 1: Write the failing service tests**

Edit `src/console-auth/console-auth.service.spec.ts`. Add a new `describe` block at the end of
the file:

```typescript
import type { Request } from 'express';

function fakeRequest(overrides?: Partial<Request>): Request {
  const session = {
    regenerate: jest.fn((callback: (error: Error | null) => void) => {
      callback(null);
    }),
  };
  return {
    session,
    ip: '127.0.0.1',
    get: jest.fn().mockReturnValue('jest-agent'),
    ...overrides,
  } as unknown as Request;
}

describe('ConsoleAuthService.consumeSigninToken', () => {
  const INVITE = {
    id: 'invite-1',
    email: 'operator@household.test',
    tokenType: InviteTokenType.OPERATOR_SIGNIN,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    usedAt: null,
    createdAt: new Date(),
  };

  function buildConsumeService(overrides?: {
    inviteFindUnique?: jest.Mock;
    operatorFindUnique?: jest.Mock;
    transaction?: jest.Mock;
  }) {
    const prisma = {
      invite: {
        findUnique: overrides?.inviteFindUnique ?? jest.fn().mockResolvedValue(INVITE),
        update: jest.fn().mockReturnValue('invite-update'),
      },
      operator: {
        findUnique: overrides?.operatorFindUnique ?? jest.fn().mockResolvedValue(OPERATOR),
        update: jest.fn().mockReturnValue('operator-update'),
      },
      $transaction: overrides?.transaction ?? jest.fn().mockResolvedValue([{}, {}]),
    };
    const auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    const emailService: EmailService = { send: jest.fn().mockResolvedValue(undefined) };
    const config = {
      get: (key: string) => ({ FRONTEND_URL: 'https://console.nostos.test' })[key],
    } as unknown as ConfigService<EnvironmentVariables, true>;

    const service = new ConsoleAuthService(
      prisma as unknown as PrismaService,
      auditLog as unknown as AuditLogService,
      config,
      emailService,
    );

    return { service, prisma, auditLog };
  }

  it('regenerates the session, sets session.operator, and returns the dashboard URL', async () => {
    const { service, prisma, auditLog } = buildConsumeService();
    const request = fakeRequest();

    const redirectUrl = await service.consumeSigninToken('raw-token', request);

    expect(redirectUrl).toBe('https://console.nostos.test/console/dashboard');
    expect(request.session.regenerate).toHaveBeenCalled();
    expect(request.session.operator).toMatchObject({ id: OPERATOR.id, email: OPERATOR.email, role: 'OPERATOR' });
    expect(prisma.$transaction).toHaveBeenCalledWith(['invite-update', 'operator-update']);
    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ operatorId: OPERATOR.id, action: 'SIGNIN' }),
    );
  });

  it('throws 404 when no invite matches the token', async () => {
    const { service } = buildConsumeService({
      inviteFindUnique: jest.fn().mockResolvedValue(null),
    });

    await expect(service.consumeSigninToken('raw-token', fakeRequest())).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: 'Link invalid or expired',
    });
  });

  it('throws 404 when the invite is already used', async () => {
    const { service } = buildConsumeService({
      inviteFindUnique: jest.fn().mockResolvedValue({ ...INVITE, usedAt: new Date() }),
    });

    await expect(service.consumeSigninToken('raw-token', fakeRequest())).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws 404 when the invite is expired', async () => {
    const { service } = buildConsumeService({
      inviteFindUnique: jest
        .fn()
        .mockResolvedValue({ ...INVITE, expiresAt: new Date(Date.now() - 1000) }),
    });

    await expect(service.consumeSigninToken('raw-token', fakeRequest())).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('throws 404 when the operator behind the invite is no longer active', async () => {
    const { service } = buildConsumeService({
      operatorFindUnique: jest
        .fn()
        .mockResolvedValue({ ...OPERATOR, status: OperatorStatus.INACTIVE }),
    });

    await expect(service.consumeSigninToken('raw-token', fakeRequest())).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/console-auth/console-auth.service.spec.ts`

Expected: FAIL — `service.consumeSigninToken is not a function`.

- [ ] **Step 3: Implement consumeSigninToken**

Edit `src/console-auth/console-auth.service.ts`. Add imports:

```typescript
import type { Request } from 'express';
```

Add a module-level helper, above the `ConsoleAuthService` class:

```typescript
function regenerateSession(request: Request): Promise<void> {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error: Error | null) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
```

Add the method inside the `ConsoleAuthService` class, after `requestSignin`:

```typescript
  async consumeSigninToken(rawToken: string, request: Request): Promise<string> {
    const tokenHash = hashToken(rawToken);
    const invite = await this.prisma.invite.findUnique({ where: { tokenHash } });

    const isValid =
      invite !== null &&
      invite.tokenType === InviteTokenType.OPERATOR_SIGNIN &&
      invite.usedAt === null &&
      invite.expiresAt.getTime() > Date.now();

    if (!isValid) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Link invalid or expired',
        HttpStatus.NOT_FOUND,
      );
    }

    const operator = await this.prisma.operator.findUnique({
      where: { email: invite.email },
    });

    if (!operator || operator.status !== OperatorStatus.ACTIVE) {
      throw new AppException(
        ErrorCode.NOT_FOUND,
        'Link invalid or expired',
        HttpStatus.NOT_FOUND,
      );
    }

    await regenerateSession(request);

    const now = new Date();
    request.session.operator = {
      id: operator.id,
      email: operator.email,
      role: 'OPERATOR',
      sessionCreatedAt: now.toISOString(),
      lastActivityAt: now.toISOString(),
    };

    await this.prisma.$transaction([
      this.prisma.invite.update({ where: { id: invite.id }, data: { usedAt: now } }),
      this.prisma.operator.update({ where: { id: operator.id }, data: { lastLoginAt: now } }),
    ]);

    await this.auditLog.record({
      operatorId: operator.id,
      action: 'SIGNIN',
      details: { email: operator.email, success: true },
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });

    const frontendUrl = this.config.get('FRONTEND_URL', { infer: true });
    return `${frontendUrl}/console/dashboard`;
  }
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx jest src/console-auth/console-auth.service.spec.ts`

Expected: PASS, 10 tests total (5 from Task 7 + 5 new).

- [ ] **Step 5: Add the controller route**

Edit `src/console-auth/console-auth.controller.ts`:

```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';

import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ConsoleAuthService } from './console-auth.service';
import { SigninRequestDto } from './dto/signin-request.dto';

@Controller('console/auth')
export class ConsoleAuthController {
  constructor(private readonly consoleAuthService: ConsoleAuthService) {}

  @Post('signin')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Check your email for a signin link')
  async signin(@Body() body: SigninRequestDto): Promise<{ email: string }> {
    return this.consoleAuthService.requestSignin(body.email);
  }

  @Get('signin/:token')
  @Public()
  async consumeSigninToken(
    @Param('token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const redirectUrl = await this.consoleAuthService.consumeSigninToken(token, request);
    response.redirect(HttpStatus.FOUND, redirectUrl);
  }
}
```

- [ ] **Step 6: Write the failing e2e test**

Edit `test/console-auth.e2e-spec.ts`. Add a new `describe` block inside the outer
`describe('console auth (e2e)', ...)`, after the `signin` block:

```typescript
  describe('GET /console/auth/signin/:token', () => {
    it('redirects to the dashboard and marks the invite used for a valid token', async () => {
      await request(server())
        .post('/api/v1/console/auth/signin')
        .send({ email: SEED_OPERATOR_EMAIL })
        .expect(200);

      const token = extractSigninToken(fakeEmailService.sent[0]);

      const response = await request(server())
        .get(`/api/v1/console/auth/signin/${token}`)
        .expect(302);

      // Asserts the path rather than the full URL: the exact origin depends on
      // whatever FRONTEND_URL resolves to in this environment (see Step 7).
      expect(response.headers.location).toContain('/console/dashboard');

      const invite = await prisma.invite.findFirst({
        where: { email: SEED_OPERATOR_EMAIL },
        orderBy: { createdAt: 'desc' },
      });
      expect(invite?.usedAt).not.toBeNull();

      const operator = await prisma.operator.findUnique({ where: { id: SEED_OPERATOR_ID } });
      expect(operator?.lastLoginAt).not.toBeNull();
    });

    it('returns 404 for an unknown token', async () => {
      const response = await request(server())
        .get(`/api/v1/console/auth/signin/${'0'.repeat(64)}`)
        .expect(404);

      expect((response.body as ApiErrorResponse).error).toMatchObject({
        code: 'NOT_FOUND',
        message: 'Link invalid or expired',
      });
    });

    it('returns 404 when the same token is used twice', async () => {
      await request(server())
        .post('/api/v1/console/auth/signin')
        .send({ email: SEED_OPERATOR_EMAIL })
        .expect(200);
      const token = extractSigninToken(fakeEmailService.sent[fakeEmailService.sent.length - 1]);

      await request(server()).get(`/api/v1/console/auth/signin/${token}`).expect(302);
      await request(server()).get(`/api/v1/console/auth/signin/${token}`).expect(404);
    });
  });
```

Add the import at the top of the file:

```typescript
import { extractSigninToken, FakeEmailService } from './fixtures/fake-email.service';
```

(replacing the existing `import { FakeEmailService } from './fixtures/fake-email.service';` line).

- [ ] **Step 7: Run it and watch it pass**

Run: `npx jest --config ./test/jest-e2e.json test/console-auth.e2e-spec.ts`

Expected: PASS, 7 tests total. The redirect assertion depends on `FRONTEND_URL` defaulting to
`http://localhost:5173` (see `src/config/env.validation.ts`) when unset in the test environment —
confirm `test/load-test-env.ts` does not override it; if a future change sets `FRONTEND_URL` for
e2e, update this assertion to match.

- [ ] **Step 8: Full verification and commit**

Run: `npm run type-check && npm run lint:ci && npm test && npm run test:e2e`

```bash
git add src/console-auth test/console-auth.e2e-spec.ts
git commit -m "feat(auth): add GET /console/auth/signin/:token"
```

---

### Task 9: POST /console/auth/logout

**Files:**
- Modify: `src/console-auth/console-auth.service.ts`
- Modify: `src/console-auth/console-auth.service.spec.ts`
- Modify: `src/console-auth/console-auth.controller.ts`
- Modify: `test/console-auth.e2e-spec.ts`

**Interfaces:**
- Consumes: `OperatorGuard`, `ActivityRefreshGuard` (Task 2/3), `GetOperator` (Task 2), `OperatorSessionUser` (Task 2), `SESSION_COOKIE_NAME` (`src/config/session.config.ts`).
- Produces: `ConsoleAuthService.logout(request: Request, operator: OperatorSessionUser): Promise<void>`; `POST /api/v1/console/auth/logout`.

- [ ] **Step 1: Write the failing service test**

Edit `src/console-auth/console-auth.service.spec.ts`. Add at the end of the file:

```typescript
describe('ConsoleAuthService.logout', () => {
  it('records a LOGOUT audit entry and destroys the session', async () => {
    const { service, auditLog } = buildConsumeService();
    const destroy = jest.fn((callback: (error: Error | null) => void) => callback(null));
    const request = fakeRequest({
      session: { regenerate: jest.fn(), destroy } as unknown as Request['session'],
    });

    await service.logout(request, {
      id: OPERATOR.id,
      email: OPERATOR.email,
      role: 'OPERATOR',
      sessionCreatedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    });

    expect(auditLog.record).toHaveBeenCalledWith(
      expect.objectContaining({ operatorId: OPERATOR.id, action: 'LOGOUT' }),
    );
    expect(destroy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npx jest src/console-auth/console-auth.service.spec.ts`

Expected: FAIL — `service.logout is not a function`.

- [ ] **Step 3: Implement logout**

Edit `src/console-auth/console-auth.service.ts`. Add the import:

```typescript
import type { OperatorSessionUser } from '../common/types/operator-session';
```

Add the method inside `ConsoleAuthService`, after `consumeSigninToken`:

```typescript
  async logout(request: Request, operator: OperatorSessionUser): Promise<void> {
    await this.auditLog.record({
      operatorId: operator.id,
      action: 'LOGOUT',
      ipAddress: request.ip,
      userAgent: request.get('user-agent'),
    });

    await new Promise<void>((resolve, reject) => {
      request.session.destroy((error: Error | null) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
```

- [ ] **Step 4: Run it and watch it pass**

Run: `npx jest src/console-auth/console-auth.service.spec.ts`

Expected: PASS, 11 tests total.

- [ ] **Step 5: Add the controller route**

Edit `src/console-auth/console-auth.controller.ts`:

```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';

import { GetOperator } from '../common/decorators/get-operator.decorator';
import { Public } from '../common/decorators/public.decorator';
import { ResponseMessage } from '../common/decorators/response-message.decorator';
import { ActivityRefreshGuard } from '../common/guards/activity-refresh.guard';
import { OperatorGuard } from '../common/guards/operator.guard';
import type { OperatorSessionUser } from '../common/types/operator-session';
import { SESSION_COOKIE_NAME } from '../config/session.config';
import { ConsoleAuthService } from './console-auth.service';
import { SigninRequestDto } from './dto/signin-request.dto';

@Controller('console/auth')
export class ConsoleAuthController {
  constructor(private readonly consoleAuthService: ConsoleAuthService) {}

  @Post('signin')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Check your email for a signin link')
  async signin(@Body() body: SigninRequestDto): Promise<{ email: string }> {
    return this.consoleAuthService.requestSignin(body.email);
  }

  @Get('signin/:token')
  @Public()
  async consumeSigninToken(
    @Param('token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ): Promise<void> {
    const redirectUrl = await this.consoleAuthService.consumeSigninToken(token, request);
    response.redirect(HttpStatus.FOUND, redirectUrl);
  }

  @Post('logout')
  @Public()
  @UseGuards(OperatorGuard, ActivityRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Logged out successfully')
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @GetOperator() operator: OperatorSessionUser,
  ): Promise<Record<string, never>> {
    await this.consoleAuthService.logout(request, operator);
    response.clearCookie(SESSION_COOKIE_NAME);
    return {};
  }
}
```

- [ ] **Step 6: Write the failing e2e test**

Edit `test/console-auth.e2e-spec.ts`. Add these imports at the top:

```typescript
import { SESSION_COOKIE_NAME } from '../src/config/session.config';
```

Add this local helper near the top of the file, after the existing imports:

```typescript
function asArray(header: string | string[] | undefined): string[] {
  if (!header) {
    return [];
  }
  return Array.isArray(header) ? header : [header];
}
```

Add a new `describe` block inside `describe('console auth (e2e)', ...)`, after the
`signin/:token` block:

```typescript
  describe('POST /console/auth/logout', () => {
    it('returns 401 when not authenticated', async () => {
      await request(server()).post('/api/v1/console/auth/logout').expect(401);
    });

    it('destroys the session, clears the cookie, and rejects the old cookie afterwards', async () => {
      await request(server())
        .post('/api/v1/console/auth/signin')
        .send({ email: SEED_OPERATOR_EMAIL })
        .expect(200);
      const token = extractSigninToken(fakeEmailService.sent[fakeEmailService.sent.length - 1]);

      const agent = request.agent(server());
      await agent.get(`/api/v1/console/auth/signin/${token}`).expect(302);

      const response = await agent.post('/api/v1/console/auth/logout').expect(200);
      expect(response.body).toEqual({
        success: true,
        data: {},
        message: 'Logged out successfully',
      });

      const clearedCookie = asArray(response.headers['set-cookie']).find((c) =>
        c.startsWith(`${SESSION_COOKIE_NAME}=;`),
      );
      expect(clearedCookie).toBeDefined();

      await agent.get('/api/v1/console-probe/protected').expect(401);
    });
  });
```

- [ ] **Step 7: Run it and watch it pass**

Run: `npx jest --config ./test/jest-e2e.json test/console-auth.e2e-spec.ts`

Expected: PASS, 9 tests total.

- [ ] **Step 8: Full verification and commit**

Run: `npm run type-check && npm run lint:ci && npm test && npm run test:e2e`

Expected: every command exits 0. This is the last task in the plan — also confirm
`npm run build && ls dist/main.js` still succeeds (the CI build step), since a new feature
module is now part of the compiled graph.

```bash
git add src/console-auth test/console-auth.e2e-spec.ts
git commit -m "feat(auth): add POST /console/auth/logout"
```

---

## Self-Review Notes

- **Spec coverage:** Quick Reference (auth method, session duration/activity refresh, signin
  rate limit, audit trail, Resend-only email) — Tasks 1–9. Section 1's three auth endpoints —
  Tasks 7–9. Section 2's two guards — Tasks 2–3. Section 3's operator/invite/audit-log indexes
  this slice owns — Task 1. Section 4's signin rate limit — Task 7. Section 5's `SIGNIN`/`LOGOUT`
  audit actions — Tasks 6, 8, 9. Section 6's error/status mapping for these three endpoints —
  Tasks 7–9 (via the existing `AppException`/`AllExceptionsFilter` infrastructure). Section 7's
  operator signin email — Task 5. Section 8's deployment checklist items relevant to this slice
  (audit table + indexes, rate limiting, guards applied, error handling tested, one email template,
  session config unchanged) are all exercised by Tasks 1–9's tests. Household endpoints, the
  admin-claim email, dashboard metrics, and the resend-invite rate limit are explicitly out of
  scope — they are the follow-up plan referenced in this plan's Goal section.
- **Placeholder scan:** no TBD/TODO markers; every step carries the actual code, not a
  description of it.
- **Type consistency:** `OperatorSessionUser` (Task 2) is the same shape used by
  `ConsoleAuthService` (Tasks 8–9), `ActivityRefreshGuard` (Task 3), and the console probe fixture
  (Task 2). `EMAIL_SERVICE`/`EmailService`/`SendEmailParams` (Task 4) are the same names consumed
  by `ConsoleAuthService` (Task 7) and the e2e fixture (Task 7). `RecordAuditLogEntry` (Task 6)
  matches every `auditLog.record(...)` call site (Tasks 7–9).
