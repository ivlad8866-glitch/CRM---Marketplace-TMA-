# Telegram Mini App CRM — Backend + Auth + DB Design Spec

**Date:** 2026-03-15
**Scope:** Subsystem 1 of 5 — Backend API, Authentication, Database, Real-time Chat infrastructure
**Status:** Approved by user after 6 review rounds

---

## 1. Overview

### 1.1 Product Goal

A Telegram Mini App that turns "Contact Support" for any service provider into a full CRM system with chat, file attachments, ticket statuses, and agent assignment. Admin creates a "service/support channel," gets a deep link, inserts it into their Telegram bot button. Customer opens the link — Mini App auto-binds their Telegram account, creates a unique client/ticket number, and opens a real-time chat with support agents.

### 1.2 Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-tenant | From day 1 | Cheaper to design upfront than retrofit DB schema |
| Architecture | Monorepo (pnpm workspace) | Shared types, single Docker Compose, unified CI |
| Backend | NestJS + Prisma + PostgreSQL | Modular DI, guards, WebSocket gateway, Swagger |
| Real-time | Socket.IO | Reliable transport, room abstraction, fallback |
| File storage | MinIO (S3-compatible) | Pre-signed URLs, no backend memory pressure |
| Cache/presence | Redis | Typing, anti-replay, rate limits, presence |
| Queue | BullMQ | SLA timers, notifications, file processing |
| Frontend state | TanStack Query + Context | Server state cached/invalidated; auth/socket in context |
| Design style | Telegram native dark theme (#2ea6ff accent) | User requirement — no pink unicorns |

---

## 2. Repository Structure

```
app-crm-chat/
├── pnpm-workspace.yaml
├── package.json                      # Root: scripts, lint, husky
├── .eslintrc.js
├── .prettierrc
├── tsconfig.base.json
├── docker-compose.yml
├── docker-compose.override.yml       # Dev overrides
├── .env.example
├── .husky/
│
├── packages/
│   └── shared/                       # @crm/shared
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── types/                # DTO types, enums, socket events
│           ├── constants/
│           ├── validators/           # Zod schemas
│           └── index.ts
│
├── frontend/                         # @crm/frontend
│   ├── package.json
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── main.tsx
│       ├── app.tsx
│       ├── config/
│       ├── lib/                      # api-client, socket-client, telegram-bridge
│       ├── hooks/
│       ├── store/                    # AuthContext, SocketContext, WorkspaceContext
│       ├── router/
│       ├── pages/
│       │   ├── loading/
│       │   ├── client/               # welcome, chat, history, rating
│       │   └── admin/                # dashboard, tickets, ticket-detail, services, team, macros, customers, settings
│       ├── components/
│       │   ├── ui/                   # Design system (CSS Modules)
│       │   ├── chat/                 # message-list, bubble, input, emoji, upload
│       │   ├── tickets/              # list, card, filters, sla-badge
│       │   ├── customer/             # sidebar, card, custom-fields, notes
│       │   └── layout/              # app-shell, topbar, sidebar-nav, safe-area
│       └── styles/
│           ├── globals.css
│           ├── telegram-theme.css
│           ├── animations.css
│           └── tokens.ts
│
├── backend/                          # @crm/backend
│   ├── package.json
│   ├── Dockerfile
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── test/
│   │   ├── unit/
│   │   └── e2e/
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── infrastructure/
│       │   ├── prisma/
│       │   ├── storage/              # S3/MinIO, pre-signed URLs
│       │   ├── queue/                # BullMQ
│       │   ├── logger/               # pino, correlation ID, PII redaction
│       │   └── redis/
│       ├── auth/
│       │   ├── controller/
│       │   ├── service/              # TelegramVerifyService, JwtService
│       │   ├── dto/
│       │   ├── guards/
│       │   ├── strategies/
│       │   └── auth.module.ts
│       ├── users/
│       │   ├── controller/
│       │   ├── service/
│       │   ├── repository/
│       │   ├── dto/
│       │   └── users.module.ts
│       ├── workspaces/
│       ├── services/
│       ├── tickets/
│       │   ├── controller/
│       │   ├── service/
│       │   ├── repository/
│       │   ├── dto/
│       │   ├── state-machine/
│       │   └── tickets.module.ts
│       ├── messages/
│       ├── customers/
│       ├── team/
│       ├── macros/
│       ├── audit/
│       ├── chat/
│       │   ├── chat.gateway.ts
│       │   ├── chat.module.ts
│       │   └── guards/
│       └── common/
│           ├── decorators/
│           ├── guards/
│           ├── filters/
│           ├── interceptors/
│           ├── middleware/
│           └── pipes/
│
└── docs/
```

---

## 3. Database Schema

### 3.1 Enums

```prisma
enum Role { WORKSPACE_OWNER ADMIN AGENT CUSTOMER }
// SUPERADMIN removed: no cross-workspace admin panel in MVP scope.
// Add back when SaaS admin features are needed (billing, system health, etc.).
enum TicketStatus { NEW IN_PROGRESS WAITING_CUSTOMER RESOLVED CLOSED SPAM DUPLICATE }
enum TicketPriority { LOW NORMAL HIGH URGENT }
enum MessageAuthor { CUSTOMER AGENT SYSTEM }
enum MessageType { TEXT FILE NOTE }
enum MembershipStatus { INVITED ACTIVE DEACTIVATED }
enum ScanStatus { PENDING CLEAN INFECTED }
```

### 3.2 Models

#### Multi-tenant core

```prisma
model Workspace {
  id             String   @id @default(cuid())
  name           String
  slug           String   @unique
  botUsername     String?
  brandConfig    Json     @default("{}")
  slaDefaults    Json     @default("{}")
  isDeleted      Boolean  @default(false)
  deletedAt      DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  memberships      Membership[]
  services         Service[]
  customerProfiles CustomerProfile[]
  tickets          Ticket[]
  macros           Macro[]
  customFieldDefs  CustomFieldDef[]
  auditLogs        AuditLog[]
  counters         WorkspaceCounter[]
  messages         Message[]

  @@index([isDeleted])
}

model WorkspaceCounter {
  id             String   @id @default(cuid())
  counterType    String   // "client" | "ticket"
  lastValue      Int      @default(0)

  workspaceId    String
  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  @@unique([workspaceId, counterType])
}

model Membership {
  id             String           @id @default(cuid())
  role           Role
  status         MembershipStatus @default(INVITED)
  joinedAt       DateTime?
  createdAt      DateTime         @default(now())

  userId         String
  user           User             @relation(fields: [userId], references: [id], onDelete: Restrict)
  workspaceId    String
  workspace      Workspace        @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  assignedTickets Ticket[]        @relation("AssignedAgent")

  @@unique([userId, workspaceId])
  @@index([workspaceId, role])
}
```

#### Users & Sessions

```prisma
model User {
  id             String   @id @default(cuid())
  telegramId     BigInt   @unique  // Serialize to string in JSON responses
  username       String?
  firstName      String
  lastName       String?
  languageCode   String?
  photoUrl       String?
  isBot          Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  memberships      Membership[]
  customerProfiles CustomerProfile[]
  sessions         Session[]
  sentMessages     Message[]    @relation("MessageAuthor")
  reactions        Reaction[]
  auditLogs        AuditLog[]   @relation("AuditActor")
}

model Session {
  id                String   @id @default(cuid())
  refreshTokenHash  String   @unique  // SECURITY: SHA-256(token + pepper), never raw
  fingerprint       String?           // SHA-256(userAgent + ipSubnet)
  expiresAt         DateTime
  revokedAt         DateTime?         // null = active; set = revoked
  userAgent         String?
  ipAddress         String?
  createdAt         DateTime @default(now())

  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}
```

#### Customer profiles

```prisma
model CustomerProfile {
  id             String   @id @default(cuid())
  clientNumber   String   // "C-000042" — via WorkspaceCounter
  segment        String?
  notes          String?
  isBanned       Boolean  @default(false)
  banReason      String?
  isDeleted      Boolean  @default(false)
  deletedAt      DateTime?
  customFields   Json     @default("{}")
  version        Int      @default(1)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Restrict)
  workspaceId    String
  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  tickets        Ticket[]

  @@unique([userId, workspaceId])
  @@unique([clientNumber, workspaceId])
  @@index([workspaceId, isDeleted])
}
```

#### Services

```prisma
model Service {
  id             String   @id @default(cuid())
  name           String
  description    String?
  startParam     String   @unique   // @unique already creates an index; no separate @@index needed
  slaMinutes     Int      @default(30)
  isActive       Boolean  @default(true)
  routingMode    String   @default("manual") // "manual" | "round_robin"
  version        Int      @default(1)   // optimistic locking
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  workspaceId    String
  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  tickets        Ticket[]

  @@index([workspaceId, isActive])
}
```

#### Tickets

```prisma
model Ticket {
  id               String         @id @default(cuid())
  ticketNumber     String         // "T-2026-000001" — via WorkspaceCounter
  status           TicketStatus   @default(NEW)
  priority         TicketPriority @default(NORMAL)
  title            String?
  summary          String?
  tags             String[]       @default([])
  firstResponseAt  DateTime?
  resolvedAt       DateTime?
  closedAt         DateTime?
  slaDeadline      DateTime?
  rating           Int?           // CHECK 1-5 in migration
  ratingComment    String?
  isDeleted        Boolean        @default(false)
  deletedAt        DateTime?
  version          Int            @default(1)
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt

  workspaceId      String
  workspace        Workspace      @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
  serviceId        String
  service          Service        @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  customerId       String
  customer         CustomerProfile @relation(fields: [customerId], references: [id], onDelete: Restrict)
  assigneeId       String?
  assignee         Membership?    @relation("AssignedAgent", fields: [assigneeId], references: [id], onDelete: SetNull)

  messages         Message[]

  @@unique([ticketNumber, workspaceId])
  @@index([workspaceId, status, priority, updatedAt])
  @@index([workspaceId, assigneeId])
  @@index([workspaceId, serviceId])
  @@index([workspaceId, slaDeadline])
  @@index([customerId])
  @@index([workspaceId, isDeleted])
}
```

#### Messages & Attachments

```prisma
model Message {
  id             String        @id @default(cuid())
  type           MessageType   @default(TEXT)
  authorType     MessageAuthor
  text           String?
  isEdited       Boolean       @default(false)
  isDeleted      Boolean       @default(false)
  deliveredAt    DateTime?
  readAt         DateTime?
  eventSeq       Int           // Set by application logic in createMessageWithSeq() — NOT a DB auto-increment
  version        Int           @default(1)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  ticketId       String
  ticket         Ticket        @relation(fields: [ticketId], references: [id], onDelete: Restrict)
  workspaceId    String
  workspace      Workspace     @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
  authorUserId   String?
  author         User?         @relation("MessageAuthor", fields: [authorUserId], references: [id], onDelete: SetNull)

  attachments    Attachment[]
  reactions      Reaction[]

  @@index([ticketId, createdAt])
  @@index([ticketId, eventSeq])
  @@index([workspaceId, createdAt])
  @@index([authorUserId])            // for GDPR erasure queries and admin investigations
}

model Attachment {
  id             String     @id @default(cuid())
  storageKey     String
  originalName   String
  mimeType       String
  sizeBytes      Int        // CHECK >= 0 in migration
  previewUrl     String?
  scanStatus     ScanStatus @default(PENDING)
  createdAt      DateTime   @default(now())

  messageId      String
  message        Message    @relation(fields: [messageId], references: [id], onDelete: Cascade)

  // Denormalized for fast workspace-scoped queries (avoids Message→Ticket join)
  workspaceId    String

  @@index([messageId])
  @@index([workspaceId])
}

model Reaction {
  id             String   @id @default(cuid())
  emoji          String
  createdAt      DateTime @default(now())

  messageId      String
  message        Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])
}
```

#### CRM fields, Macros, Audit

```prisma
model CustomFieldDef {
  id             String   @id @default(cuid())
  name           String
  label          String
  fieldType      String   // "text" | "number" | "date" | "select"
  options        Json?
  isRequired     Boolean  @default(false)
  sortOrder      Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  workspaceId    String
  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  @@unique([workspaceId, name])
}

model Macro {
  id             String   @id @default(cuid())
  name           String
  content        String
  category       String?
  sortOrder      Int      @default(0)
  version        Int      @default(1)   // optimistic locking
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  workspaceId    String
  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  @@index([workspaceId])
}

model AuditLog {
  id             String   @id @default(cuid())
  action         String
  entityType     String
  entityId       String
  oldValue       Json?
  newValue       Json?
  ipAddress      String?
  userAgent      String?
  createdAt      DateTime @default(now())

  userId         String?
  actor          User?    @relation("AuditActor", fields: [userId], references: [id], onDelete: SetNull)
  workspaceId    String
  workspace      Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  @@index([workspaceId, createdAt])
  @@index([entityType, entityId])
  @@index([userId])
}
```

### 3.3 Atomic counter generation strategy (WorkspaceCounter)

The `WorkspaceCounter` model provides sequential number generation for `clientNumber` and `ticketNumber`. Prisma does not support `SELECT ... FOR UPDATE` natively, so we use an interactive transaction with raw SQL:

```typescript
async function nextCounter(
  prisma: PrismaClient,
  workspaceId: string,
  counterType: 'client' | 'ticket',
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    // Row-level lock via FOR UPDATE — blocks concurrent reads until commit
    const [row] = await tx.$queryRaw<{ lastValue: number }[]>`
      SELECT "lastValue"
      FROM "WorkspaceCounter"
      WHERE "workspaceId" = ${workspaceId} AND "counterType" = ${counterType}
      FOR UPDATE
    `;
    if (!row) throw new Error(`Counter not found: ${workspaceId}/${counterType}`);

    const nextValue = row.lastValue + 1;
    await tx.$queryRaw`
      UPDATE "WorkspaceCounter"
      SET "lastValue" = ${nextValue}
      WHERE "workspaceId" = ${workspaceId} AND "counterType" = ${counterType}
    `;
    return nextValue;
  }, {
    isolationLevel: 'Serializable', // strongest guarantee
    timeout: 5000,
  });
}

// Usage:
const clientSeq = await nextCounter(prisma, workspaceId, 'client');
const clientNumber = `C-${String(clientSeq).padStart(6, '0')}`; // "C-000042"

const ticketSeq = await nextCounter(prisma, workspaceId, 'ticket');
const year = new Date().getFullYear();
const ticketNumber = `T-${year}-${String(ticketSeq).padStart(6, '0')}`; // "T-2026-000001"
```

On `@@unique` constraint violation (race condition edge case): catch `PrismaClientKnownRequestError` with code `P2002`, retry once. This should be extremely rare with `FOR UPDATE`.

### 3.4 Message.eventSeq generation strategy

`eventSeq` is per-ticket auto-increment for gap detection on WebSocket reconnect. Generated similarly to counters but using inline max-query inside the message creation transaction:

```typescript
async function createMessageWithSeq(
  prisma: PrismaClient,
  ticketId: string,
  data: CreateMessageData,
): Promise<Message> {
  return prisma.$transaction(async (tx) => {
    // Lock ticket row to serialize eventSeq generation
    await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;

    const [{ max }] = await tx.$queryRaw<{ max: number | null }[]>`
      SELECT MAX("eventSeq") as max FROM "Message" WHERE "ticketId" = ${ticketId}
    `;
    const nextSeq = (max ?? 0) + 1;

    return tx.message.create({
      data: { ...data, ticketId, eventSeq: nextSeq },
    });
  });
}
```

### 3.5 Soft-delete filtering convention

**All list endpoints exclude soft-deleted records by default** (`WHERE isDeleted = false`). The repository layer enforces this automatically. No `?includeDeleted` query parameter is exposed — soft-deleted records are only accessible via direct database queries for audit/debugging purposes.

### 3.6 SQL migration additions (CHECK constraints + GIN index)

```sql
ALTER TABLE "Ticket" ADD CONSTRAINT "ticket_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);
ALTER TABLE "Attachment" ADD CONSTRAINT "attachment_size_positive" CHECK ("sizeBytes" >= 0);
CREATE INDEX idx_ticket_tags ON "Ticket" USING GIN ("tags");
```

---

## 4. Authentication & Security

### 4.1 Telegram initData verification flow

**Phase 1 — Validation (stateless, no DB):**

1. Client sends `{ initData, startParam }` to `POST /api/v1/auth/telegram`
2. Server parses initData as URLSearchParams, extracts `hash` field
3. Build `data_check_string`: all key=value pairs except hash, sorted alphabetically by key, joined with `\n`
4. `secret = HMAC-SHA256("WebAppData", BOT_TOKEN)`
5. `computed = HMAC-SHA256(data_check_string, secret)`
6. Timing-safe compare (`crypto.timingSafeEqual`) computed vs hash — reject 401 INVALID_INIT_DATA
7. Check `auth_date`: reject if older than `AUTH_DATE_TTL_SECONDS` (default 300) → 401 INIT_DATA_EXPIRED; reject if in future → 401 INVALID_INIT_DATA
8. Anti-replay: `SET initdata:<hash> EX 300 NX` in Redis — reject if key exists → 401 INIT_DATA_REPLAYED
9. Decode user JSON from initData (`id`, `first_name`, `last_name`, `username`, `language_code`, `photo_url`)

**Phase 2 — startParam resolution (read-only DB):**

10. **startParam is a direct lookup key** for the `Service` model: `SELECT * FROM Service WHERE startParam = :startParam AND isActive = true`. The `startParam` field on Service is a unique random string generated when the service is created (e.g., `cuid()` or `nanoid()`). It does NOT encode workspaceId+serviceId — it IS the service identifier. The `workspaceId` is derived from the found Service row.
11. If startParam is null/empty (agent/admin opening Mini App without deep link): skip service resolution, proceed to membership check.
12. If Service not found or inactive: return 404 SERVICE_NOT_FOUND.

**Phase 3 — User + role resolution (single Prisma transaction):**

```
prisma.$transaction(async (tx) => {
  // 13. Upsert User by telegramId
  const user = await tx.user.upsert({
    where: { telegramId },
    create: { telegramId, firstName, lastName, username, ... },
    update: { firstName, lastName, username, ... },  // sync profile
  });

  // 14. Determine role based on Membership
  const membership = await tx.membership.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });

  if (membership && membership.role !== 'CUSTOMER') {
    // ── AGENT/ADMIN PATH ──
    // 14a. Reject deactivated members
    if (membership.status === 'DEACTIVATED') {
      throw new ForbiddenException('FORBIDDEN', 'Your access has been deactivated');
    }
    // 14b. If membership.status === INVITED → activate it
    if (membership.status === 'INVITED') {
      await tx.membership.update({
        where: { id: membership.id },
        data: { status: 'ACTIVE', joinedAt: new Date() },
      });
    }
    // 14c. Return: no ticket, no clientNumber
    return { user, membership, role: membership.role,
             customerProfile: null, ticket: null };
  }

  // ── CUSTOMER PATH ──
  // 15. Upsert CustomerProfile + generate clientNumber if new
  let profile = await tx.customerProfile.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } },
  });
  if (!profile) {
    const seq = await nextCounter(tx, workspaceId, 'client');
    const clientNumber = `C-${String(seq).padStart(6, '0')}`;
    profile = await tx.customerProfile.create({
      data: { userId: user.id, workspaceId, clientNumber },
    });
    // Also create CUSTOMER membership if not exists
    await tx.membership.upsert({
      where: { userId_workspaceId: { userId: user.id, workspaceId } },
      create: { userId: user.id, workspaceId, role: 'CUSTOMER',
                status: 'ACTIVE', joinedAt: new Date() },
      update: {},
    });
  }

  // 16. Find active ticket or create new one
  //     "Active" = status NOT IN (CLOSED, SPAM, DUPLICATE)
  let ticket = await tx.ticket.findFirst({
    where: {
      customerId: profile.id,
      serviceId: service.id,
      status: { notIn: ['CLOSED', 'SPAM', 'DUPLICATE'] },
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!ticket) {
    const seq = await nextCounter(tx, workspaceId, 'ticket');
    const year = new Date().getFullYear();
    const ticketNumber = `T-${year}-${String(seq).padStart(6, '0')}`;
    ticket = await tx.ticket.create({
      data: {
        workspaceId, serviceId: service.id, customerId: profile.id,
        ticketNumber, slaDeadline: addMinutes(new Date(), service.slaMinutes),
      },
    });
  }

  return { user, membership: null, role: 'CUSTOMER',
           customerProfile: profile, ticket };
});
```

**Phase 4 — Session creation (separate from Phase 3 transaction):**

17. Generate tokens:
    - accessToken = JWT `{ sub: user.id, role, wid: workspaceId }` TTL 15m
    - refreshToken = crypto.randomBytes(32).toString('hex')
    - fingerprint = SHA-256(userAgent + ipSubnet)
    - Store SHA-256(refreshToken + REFRESH_TOKEN_PEPPER) in Session table
18. Set refreshToken in httpOnly cookie (Secure, SameSite=Strict, Path=/api)
19. Return `{ accessToken, user, workspace, service, clientNumber, ticketNumber, role }`

**Transaction boundaries rationale:** Phase 3 is a single transaction to ensure atomicity of counter increment + entity creation. Phase 4 (session) is separate — if session creation fails, the user/profile/ticket are still consistent and the client can retry auth. Phase 1-2 are stateless/read-only and need no transaction.

### 4.2 JWT strategy

- **Access token**: JWT HS256, 15 min TTL, `Authorization: Bearer` header, stateless verification, supports `JWT_SECRET_PREVIOUS` for rotation
- **Refresh token**: opaque, httpOnly cookie, 7 days TTL, SHA-256+pepper hash stored in Session
- **Refresh rotation**: each refresh revokes old session + creates new; if revoked session reused → theft detected → revoke ALL user sessions (family revocation)
- **Session fingerprint**: `SHA-256(userAgent + ipSubnet)` — reject refresh if fingerprint mismatch

### 4.3 Request pipeline

```
Request → Helmet → CORS (whitelist) → Rate limit (IP + userId + workspaceId)
  → hpp → CorrelationId middleware → WorkspaceTenant middleware
  → JwtAuthGuard → RolesGuard → WorkspaceScopeGuard
  → ZodValidationPipe → Controller → AuditLogInterceptor
  → TransformInterceptor → GlobalExceptionFilter
```

Rate limits:
- Global: 100/min per IP
- Auth: 10/min per IP
- Per userId: 200/min
- Per workspaceId: 1000/min
- WS messages: 30/min per socket
- Implementation: Redis sliding window sorted sets

### 4.4 WebSocket security

- Auth at handshake: `{ auth: { token: accessToken } }` → WsJwtGuard
- Room policy: `join_ticket` verifies ticket belongs to workspace + user is customer/agent
- Rate limits per socket: message 30/min, typing 10/min
- Max payload: 16 KB text, 64 KB with metadata
- Namespace: `/chat`

### 4.5 File upload security

- Pre-signed PUT URLs (10 min expiry), client uploads directly to MinIO
- Server-side validation: mimeType allowlist, sizeBytes <= 50MB, fileName sanitized
- On confirm: HEAD + first 8KB magic bytes check, Content-Length validation
- Blocked extensions: .exe, .bat, .cmd, .sh, .ps1, .scr, .com, .msi, .dll
- Download: pre-signed GET URL (1 hour expiry), never raw S3 URLs
- Async scan: 202 Accepted if queued, attachment:ready WS event on completion

### 4.6 Additional security measures

- Input sanitization (sanitize-html) before storage
- Prisma parameterized queries (no SQL injection by design)
- Safe error responses: `{ status, code, message, requestId }` — no stack traces
- Secrets only in env/KMS — startup validation with fatal exit if missing/short
- Refresh cookie: httpOnly, Secure, SameSite=Strict, Path=/api
- Access token: in-memory only (never localStorage)
- PII redaction in logs: pino redact config for auth headers, cookies, initData, tokens
- Workspace isolation: repository layer requires workspaceId as mandatory param

### 4.7 Secret rotation

- **JWT_SECRET:** set old as JWT_SECRET_PREVIOUS, generate new JWT_SECRET, restart; old tokens validate for 15 min via PREVIOUS; remove PREVIOUS after 15 min
- **REFRESH_TOKEN_PEPPER:** set old as REFRESH_TOKEN_PEPPER_PREVIOUS, generate new pepper, restart. On refresh verification:
  1. Try verifying hash with current pepper
  2. If no match, try with PREVIOUS pepper
  3. If PREVIOUS matches → **re-hash the session with the new pepper** (update Session.refreshTokenHash) and proceed normally
  4. If neither matches → reject
  5. Remove PREVIOUS after 7 days (all sessions will have been re-hashed by then)
- **BOT_TOKEN:** revoke via @BotFather, create new, restart; all existing initData invalidates immediately

---

## 5. API Contract

### 5.1 Conventions

- Base path: `/api/v1`
- Content-Type: `application/json`
- Auth: `Authorization: Bearer <accessToken>`
- Page-based pagination: `?page=1&limit=20` → `{ data, meta: { page, limit, total, totalPages } }` (default 20, max 100)
- Cursor-based pagination (messages): `?before=<messageId>&limit=50` → `{ data, hasMore, nextCursor }` (default 50, max 100)
- Sorting: `?sort=field&order=asc|desc`
- Timestamps: ISO 8601 UTC
- IDs: CUID strings
- BigInt: serialized as string
- Idempotency: `Idempotency-Key` header for POST /attachments, /tickets, /team/invite; `tempId` for messages via WS
- Optimistic locking: `If-Match: "<version>"` for PATCH endpoints; 409 CONFLICT on mismatch

### 5.2 Error response schema

```typescript
interface ErrorResponse {
  status: number;
  code: ErrorCode;
  message: string;
  requestId: string;
  details?: { field: string; reason: string }[];
}

type ErrorCode =
  | 'VALIDATION_ERROR'        // 422
  | 'NOT_FOUND'               // 404
  | 'TICKET_NOT_FOUND'        // 404
  | 'USER_NOT_FOUND'          // 404
  | 'WORKSPACE_NOT_FOUND'     // 404
  | 'SERVICE_NOT_FOUND'       // 404
  | 'MESSAGE_NOT_FOUND'       // 404
  | 'INVALID_INIT_DATA'       // 401
  | 'INIT_DATA_EXPIRED'       // 401
  | 'INIT_DATA_REPLAYED'      // 401
  | 'SESSION_EXPIRED'         // 401
  | 'SESSION_REVOKED'         // 401
  | 'FINGERPRINT_MISMATCH'    // 401
  | 'RATE_LIMIT_EXCEEDED'     // 429
  | 'FORBIDDEN'               // 403
  | 'CONFLICT'                // 409
  | 'INVALID_STATE_TRANSITION'// 422
  | 'EDIT_WINDOW_EXPIRED'     // 422
  | 'FILE_TYPE_NOT_ALLOWED'   // 422
  | 'FILE_TOO_LARGE'          // 422
  | 'IDEMPOTENCY_CONFLICT';   // 409
```

### 5.3 Endpoints

#### Auth
- `POST /auth/telegram` — initData verification, returns tokens + user + workspace context
- `POST /auth/refresh` — cookie-based refresh rotation
- `POST /auth/logout` — revoke current session
- `POST /auth/logout-all` — revoke all sessions (Bearer required)

#### User
- `GET /me` — current user + memberships
- `PATCH /me` — limited self-update

#### Workspaces
- `POST /workspaces` — create (any user becomes WORKSPACE_OWNER)
- `GET /workspaces/:wid` — detail (members only)
- `PATCH /workspaces/:wid` — update (OWNER/ADMIN)

#### Services
- `GET /workspaces/:wid/services` — list (members)
- `POST /workspaces/:wid/services` — create with auto-generated startParam + deep links (OWNER/ADMIN)
- `PATCH /workspaces/:wid/services/:sid` — update (OWNER/ADMIN)
- `DELETE /workspaces/:wid/services/:sid` — soft-deactivate (OWNER)

#### Tickets
- `GET /workspaces/:wid/tickets` — paginated list with filters + KPI counters (ADMIN/AGENT: all; CUSTOMER: own)
- `POST /workspaces/:wid/tickets` — create (CUSTOMER)
- `GET /workspaces/:wid/tickets/:tid` — detail with customer + messages (ADMIN/AGENT/owning CUSTOMER)
- `PATCH /workspaces/:wid/tickets/:tid` — status/priority/assignee/tags (ADMIN/AGENT, state machine validated, optimistic lock)
- `POST /workspaces/:wid/tickets/:tid/rate` — 1-5 rating (owning CUSTOMER, ticket must be RESOLVED/CLOSED)

#### Messages
- `GET /workspaces/:wid/tickets/:tid/messages` — cursor-paginated (CUSTOMER does not see NOTE type)
- `POST /workspaces/:wid/tickets/:tid/messages` — send text/note (NOTE for AGENT/ADMIN only)
- `PATCH /workspaces/:wid/tickets/:tid/messages/:mid` — edit within 5 min window (author only, optimistic lock)
- `DELETE /workspaces/:wid/tickets/:tid/messages/:mid` — soft delete (author or ADMIN)

#### Attachments
- `POST /workspaces/:wid/tickets/:tid/attachments` — request pre-signed upload URL
- `POST /workspaces/:wid/attachments/:aid/confirm` — verify + scan (200 or 202 Accepted)
- `GET /workspaces/:wid/attachments/:aid/download` — 302 redirect to pre-signed GET URL

#### Customers
- `GET /workspaces/:wid/customers` — paginated search (ADMIN/AGENT)
- `GET /workspaces/:wid/customers/:cid` — detail with tickets + custom fields (ADMIN/AGENT)
- `PATCH /workspaces/:wid/customers/:cid` — update notes/tags/fields/ban (ADMIN/AGENT, optimistic lock)

#### Team
- `GET /workspaces/:wid/team` — list (ADMIN/OWNER)
- `POST /workspaces/:wid/team/invite` — invite by telegramId (OWNER/ADMIN)
- `PATCH /workspaces/:wid/team/:mid` — update role/status (OWNER)
- `DELETE /workspaces/:wid/team/:mid` — remove (OWNER, cannot remove self/last owner)

#### Macros
- `GET /workspaces/:wid/macros` — list by category (ADMIN/AGENT)
- `POST /workspaces/:wid/macros` — create (ADMIN)
- `PATCH /workspaces/:wid/macros/:mid` — update (ADMIN)
- `DELETE /workspaces/:wid/macros/:mid` — delete (ADMIN)

#### Custom Fields
- `GET /workspaces/:wid/custom-fields` — list (ADMIN/AGENT)
- `POST /workspaces/:wid/custom-fields` — create (ADMIN)
- `PATCH /workspaces/:wid/custom-fields/:fid` — update (ADMIN)
- `DELETE /workspaces/:wid/custom-fields/:fid` — delete (ADMIN)

#### Audit
- `GET /workspaces/:wid/audit-logs` — paginated, filterable (OWNER/ADMIN)

#### Presence
- `GET /workspaces/:wid/presence` — list of currently online agents (ADMIN/AGENT). Returns `{ agents: [{ userId, membershipId, name, status: "online"|"offline", lastSeen }] }`. Reads from Redis presence keys.

#### Reports
- `GET /workspaces/:wid/reports/summary` — KPI aggregates (OWNER/ADMIN). Query: `?from=<iso>&to=<iso>`. Response:
  ```
  {
    totalTickets: number,
    byStatus: Record<TicketStatus, number>,
    avgFirstResponseMinutes: number,
    avgResolutionMinutes: number,
    slaBreachCount: number,
    avgRating: number,
    ticketsByDay: { date: string, count: number }[],
    topAgents: { agentId: string, name: string, resolved: number, avgResponseMin: number }[]
  }
  ```
- `GET /workspaces/:wid/reports/export` — CSV download (OWNER/ADMIN). Query: `?from=<iso>&to=<iso>&format=csv`. Columns: ticketNumber, clientNumber, customerName, service, status, priority, assignee, createdAt, firstResponseAt, resolvedAt, closedAt, rating, tags.

#### Health
- `GET /health` — status + version + uptime (no auth)
- `GET /health/ready` — db + redis + s3 status (no auth)

### 5.4 Socket.IO events

Namespace: `/chat`, auth via handshake `{ auth: { token } }`

**Client → Server:**
- `join_ticket { ticketId }` — join room with access verification
- `leave_ticket { ticketId }` — leave room
- `message:send { ticketId, text, type, tempId }` — persist + broadcast (tempId for idempotency)
- `typing:start / typing:stop { ticketId }` — broadcast to room
- `message:read { ticketId, messageId }` — mark read up to messageId
- `reaction:toggle { messageId, emoji }` — add/remove reaction
- `heartbeat` — every 15s, renew presence TTL in Redis

**Server → Client:**
- `message:new` — full MessageResponse to room
- `message:edited { messageId, text, updatedAt }` — to room
- `message:deleted { messageId }` — to room
- `typing:update { ticketId, userId, userName, isTyping }` — to room, auto-stop 5s
- `receipt:delivered { ticketId, messageId, deliveredAt }` — on persist
- `receipt:read { ticketId, messageId, readAt, readByUserId }` — to room
- `ticket:updated { ticketId, changes }` — status/assignment/priority changes
- `ticket:assigned { ticketId, assigneeId, assigneeName }` — to room + user:<userId>
- `notification:new { type, title, body, ticketId? }` — to user:<userId>
- `presence:update { userId, status }` — online/offline to workspace rooms
- `attachment:ready { attachmentId, ticketId, scanStatus, previewUrl }` — async scan complete

**Typing behavior (client-side contract):**
- On keypress in message input → emit `typing:start`, debounced 1s (do not flood)
- Server broadcasts `typing:update { isTyping: true }` to room (except sender)
- Server auto-emits `typing:update { isTyping: false }` if no `typing:start` received for 5s
- Client should also emit explicit `typing:stop` on: message send, input blur, component unmount
- Client UI shows "Agent typing..." for up to 5s after last `typing:update { isTyping: true }`

**Presence:** Redis key `presence:<workspaceId>:<userId>` TTL 30s, renewed by heartbeat every 15s

### 5.5 Ticket state machine

```
Allowed transitions:
  NEW              → IN_PROGRESS, SPAM, DUPLICATE
  IN_PROGRESS      → WAITING_CUSTOMER, RESOLVED, SPAM, DUPLICATE
  WAITING_CUSTOMER → IN_PROGRESS, RESOLVED, SPAM
  RESOLVED         → CLOSED, IN_PROGRESS (reopen within 7 days)
  CLOSED           → (terminal)
  SPAM             → (terminal)
  DUPLICATE        → (terminal)

Auto-transitions:
  - Agent first message to NEW → IN_PROGRESS
  - Customer reply to WAITING_CUSTOMER → IN_PROGRESS
  - RESOLVED + 7 days no activity → CLOSED (BullMQ scheduled job)
  - Customer rates RESOLVED → CLOSED
```

---

## 6. Frontend Architecture

### 6.1 Tech stack

- React 18, TypeScript, Vite
- React Router v6 (lazy loading)
- TanStack Query (server state)
- Context (auth, socket, workspace)
- Socket.IO client
- react-virtuoso (chat virtualization)
- emoji-mart (emoji picker)
- date-fns (dates)
- CSS Modules + design tokens
- Sentry (error monitoring)

### 6.2 State management

- **AuthContext**: user, role, token lifecycle, silent refresh, multi-tab sync via BroadcastChannel
- **WorkspaceContext**: workspace metadata (fetched once)
- **SocketContext**: connection state, event bus, reconnect with token rotation
- **Server state**: TanStack Query hooks with optimistic updates, cache invalidation on WS events

### 6.3 Key patterns

- API client: fetch wrapper with auto-auth, 401 refresh retry (single attempt), AbortController, Idempotency-Key
- Socket: auto-reconnect with backoff (max 30s), re-join rooms, gap detection via eventSeq
- Chat: react-virtuoso inverted list, cursor pagination, optimistic send with tempId, message status (sending/sent/failed)
- Files: client validate → pre-signed URL → XHR with progress → confirm → preview
- Telegram bridge: BackButton sync with router, haptic feedback, theme sync, safe area CSS vars
- Feature flag `VITE_NEW_FRONTEND` for gradual migration from monolithic App.tsx
- Tokens: design tokens in tokens.ts mapped to Telegram theme vars with fallbacks

### 6.4 Migration strategy

Phase 1: Infrastructure (router, contexts, api-client, socket, ui components, CSS modules)
Phase 2: Auth flow (LoadingPage with real initData, AuthContext, RouteGuard)
Phase 3: Client screens (welcome, chat, history, rating with real API)
Phase 4: Admin screens (dashboard, tickets, ticket-detail, services, team, macros, settings)
Phase 5: Polish (skeletons, error boundaries, toasts, keyboard shortcuts, accessibility)

---

## 7. Infrastructure

### 7.1 Docker Compose services

- **postgres:16-alpine** — port 5432, persistent volume, healthcheck
- **redis:7-alpine** — port 6379, appendonly persistence, 128MB max, healthcheck
- **minio** — port 9000 (S3) + 9001 (console), persistent volume, healthcheck via curl
- **minio-init** — creates `crm-attachments` bucket on startup
- **backend** — NestJS, port 3000 + 3001 (debug), hot-reload with volume mounts, runs migrate+seed on start (seed only in dev)
- **frontend** — Vite dev server, port 5173, hot-reload with volume mounts

### 7.2 Production Dockerfiles

- Backend: multi-stage (base → deps → dev → build → production with non-root user)
- Frontend: multi-stage (base → deps → dev → build → nginx:alpine)

### 7.3 Seed data

Demo workspace "Unicorn Support" with:
- 2 counters (client + ticket)
- 3 users (admin, agent, customer) with memberships
- 3 services with generated startParams
- 3 tickets in different statuses with messages
- 3 macros with variable templates
- 3 custom field definitions
- Idempotent: skips if workspace already exists

### 7.4 Environment variables

All secrets in `.env.example` with placeholders. Categories: Telegram, JWT, Refresh Token, Database, Redis, MinIO, Rate Limits, Auth, CORS, Feature Flags, Sentry.

---

## 8. Testing Strategy

### 8.1 Unit tests (Jest + Testing Library)

Backend: auth verification, JWT service, ticket state machine, message service, workspace counter atomicity
Frontend: hooks (auth, messages, upload), components (message bubble, ticket card, filters, UI primitives)

### 8.2 E2E tests

Backend (Playwright + Docker Services in CI): auth flows (valid/invalid/replay/refresh/theft), ticket CRUD + state transitions, messages + idempotency + edit window, attachments + mime validation
Frontend (Playwright): auth flow, chat send/receive, file upload, admin ticket management

### 8.3 CI pipeline

GitHub Actions: 3 parallel jobs (lint+typecheck, test-backend with Postgres+Redis services, test-frontend) → build job. pnpm cache enabled.

---

## 9. Production Readiness

### 9.1 Security checklist
- Pen-test initData, file uploads, WebSocket, tenant isolation
- HTTPS enforced, secrets in KMS, Postgres RLS evaluated
- PII scrubbed from logs and Sentry, GDPR erasure endpoint

### 9.2 Observability
- Structured logging (pino, JSON, correlation ID)
- Sentry for errors
- Health + readiness endpoints
- Prometheus metrics (future)

### 9.3 GDPR / Data retention
- AuditLog: 1 year retention, then archive/delete via BullMQ cron job
- Attachments: ticket lifetime + 90 days after ticket closed, then delete from S3 + DB
- Sessions: daily cleanup of expired/revoked sessions via BullMQ cron job
- Customer erasure sequence (`POST /workspaces/:wid/customers/:cid/erase`, OWNER only):
  1. Anonymize CustomerProfile: `clientNumber` retained, `notes/segment/customFields` → null, `isDeleted` → true
  2. Anonymize User: `firstName` → "Deleted User", `lastName/username/photoUrl` → null, `telegramId` → hash(original) to prevent re-creation
  3. Deactivate all Memberships for this user in this workspace: `status` → DEACTIVATED
  4. Messages remain but `authorUserId` is already SetNull on user anonymization — messages show as "Deleted User"
  5. Revoke all Sessions for this user
  6. Create AuditLog entry: `action: "customer.erased"`
  7. Note: User row is NOT deleted (Restrict on Membership/CustomerProfile), only anonymized

### 9.4 Backup & recovery
- Postgres: WAL + automated backups (managed in prod)
- Redis: AOF persistence
- MinIO: persistent volume (managed S3 in prod)
- Secret rotation runbooks documented
