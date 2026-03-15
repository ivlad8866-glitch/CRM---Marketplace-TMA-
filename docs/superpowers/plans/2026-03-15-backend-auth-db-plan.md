# Backend + Auth + DB Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the complete backend infrastructure for the CRM Mini App — monorepo setup, database schema, authentication via Telegram initData, REST API, WebSocket chat, and file storage.

**Architecture:** pnpm monorepo with 3 packages (`@crm/shared`, `@crm/backend`, `@crm/frontend`). Backend is NestJS with modular feature modules, infrastructure layer (Prisma, Redis, S3, BullMQ), and a Socket.IO gateway. All workspace-scoped data enforced at repository layer.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Redis, MinIO (S3), Socket.IO, BullMQ, Zod, pino, Jest

**Spec:** `docs/superpowers/specs/2026-03-15-crm-miniapp-backend-auth-db-design.md`

---

## Chunk 1: Monorepo Scaffold + Infrastructure

### Task 1: Initialize pnpm monorepo

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (root)
- Create: `tsconfig.base.json`
- Create: `.eslintrc.js`
- Create: `.prettierrc`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Initialize root package.json**

```bash
cd "c:/app crm chat"
pnpm init
```

Then replace contents:

```json
{
  "name": "crm-miniapp",
  "private": true,
  "scripts": {
    "dev": "docker compose up -d",
    "dev:backend": "cd backend && pnpm start:dev",
    "dev:frontend": "cd frontend && pnpm dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "format": "prettier --write \"**/*.{ts,tsx,json,css,md}\"",
    "test": "pnpm -r test",
    "test:e2e": "cd backend && pnpm test:e2e",
    "db:migrate": "cd backend && npx prisma migrate dev",
    "db:seed": "cd backend && npx prisma db seed",
    "db:studio": "cd backend && npx prisma studio",
    "typecheck": "pnpm -r typecheck",
    "prepare": "husky"
  },
  "devDependencies": {
    "husky": "^9.0.0",
    "lint-staged": "^15.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.5.4"
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{css,json,md}": ["prettier --write"]
  }
}
```

- [ ] **Step 2: Create pnpm-workspace.yaml**

```yaml
packages:
  - 'packages/*'
  - 'frontend'
  - 'backend'
```

- [ ] **Step 3: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  }
}
```

- [ ] **Step 4: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

- [ ] **Step 5: Create .eslintrc.js**

```javascript
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: { node: true, es2022: true },
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
};
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
.env
*.log
.DS_Store
coverage/
.turbo/
```

- [ ] **Step 7: Create .env.example**

```bash
# Telegram
BOT_TOKEN=
BOT_USERNAME=

# JWT
JWT_SECRET=change-me-min-32-chars-random-string
JWT_SECRET_PREVIOUS=
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

# Refresh Token
REFRESH_TOKEN_PEPPER=change-me-min-32-chars-random-hex
REFRESH_TOKEN_PEPPER_PREVIOUS=

# Database
DATABASE_URL=postgresql://crm:crm_dev_pass@localhost:5432/crm
DB_PASSWORD=crm_dev_pass

# Redis
REDIS_URL=redis://localhost:6379

# MinIO / S3
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=crm-attachments
MINIO_USE_SSL=false

# Rate Limits
RATE_LIMIT_GLOBAL_PER_MIN=100
RATE_LIMIT_AUTH_PER_MIN=10
RATE_LIMIT_WS_MSG_PER_MIN=30

# Auth
AUTH_DATE_TTL_SECONDS=300
CORS_ORIGIN=http://localhost:5173

# Feature Flags
VITE_NEW_FRONTEND=true
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
VITE_SENTRY_DSN=
```

- [ ] **Step 8: Commit**

```bash
git add pnpm-workspace.yaml package.json tsconfig.base.json .eslintrc.js .prettierrc .gitignore .env.example
git commit -m "chore: initialize pnpm monorepo with root config"
```

---

### Task 2: Move existing frontend into frontend/ workspace

**Files:**
- Move: `App.tsx`, `main.tsx`, `styles.css`, `index.html`, `vite.config.ts`, `tsconfig.json`, `telegram.d.ts`, `src/`, `public/` → `frontend/`
- Modify: `frontend/package.json`
- Modify: `frontend/tsconfig.json` (extend base)

- [ ] **Step 1: Create frontend directory and move files**

```bash
cd "c:/app crm chat"
mkdir -p frontend
mv App.tsx main.tsx styles.css index.html vite.config.ts telegram.d.ts public/ frontend/
mv src/ frontend/
cp package.json frontend/package.json
```

- [ ] **Step 2: Update frontend/package.json**

```json
{
  "name": "@crm/frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src/ --ext .ts,.tsx",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.1"
  }
}
```

- [ ] **Step 3: Update frontend/tsconfig.json to extend base**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2020",
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": ["**/*.ts", "**/*.tsx"]
}
```

- [ ] **Step 4: Verify frontend still builds**

```bash
cd frontend && pnpm install && pnpm build
```

Expected: Build succeeds with no errors.

- [ ] **Step 5: Remove old root files (now in frontend/)**

```bash
cd "c:/app crm chat"
rm -f devserver.err devserver.log
rm -rf node_modules package-lock.json
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move existing frontend into frontend/ workspace"
```

---

### Task 3: Create @crm/shared package

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/enums.ts`
- Create: `packages/shared/src/types/user.ts`
- Create: `packages/shared/src/types/ticket.ts`
- Create: `packages/shared/src/types/message.ts`
- Create: `packages/shared/src/types/workspace.ts`
- Create: `packages/shared/src/types/socket-events.ts`
- Create: `packages/shared/src/types/api.ts`
- Create: `packages/shared/src/constants/index.ts`
- Create: `packages/shared/src/validators/index.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "@crm/shared",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "lint": "eslint src/ --ext .ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "typescript": "^5.5.4"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create src/types/enums.ts**

All enums matching the Prisma schema (spec Section 3.1):

```typescript
export enum Role {
  WORKSPACE_OWNER = 'WORKSPACE_OWNER',
  ADMIN = 'ADMIN',
  AGENT = 'AGENT',
  CUSTOMER = 'CUSTOMER',
}

export enum TicketStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_CUSTOMER = 'WAITING_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  SPAM = 'SPAM',
  DUPLICATE = 'DUPLICATE',
}

export enum TicketPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum MessageAuthor {
  CUSTOMER = 'CUSTOMER',
  AGENT = 'AGENT',
  SYSTEM = 'SYSTEM',
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  NOTE = 'NOTE',
}

export enum MembershipStatus {
  INVITED = 'INVITED',
  ACTIVE = 'ACTIVE',
  DEACTIVATED = 'DEACTIVATED',
}

export enum ScanStatus {
  PENDING = 'PENDING',
  CLEAN = 'CLEAN',
  INFECTED = 'INFECTED',
}
```

- [ ] **Step 4: Create src/types/user.ts**

```typescript
export interface UserResponse {
  id: string;
  telegramId: string; // BigInt serialized as string
  username: string | null;
  firstName: string;
  lastName: string | null;
  languageCode: string | null;
  photoUrl: string | null;
  createdAt: string;
}
```

- [ ] **Step 5: Create src/types/workspace.ts**

```typescript
import { Role, MembershipStatus } from './enums';

export interface WorkspaceResponse {
  id: string;
  name: string;
  slug: string;
  botUsername: string | null;
  brandConfig: Record<string, unknown>;
  slaDefaults: Record<string, number>;
  createdAt: string;
}

export interface MembershipResponse {
  id: string;
  role: Role;
  status: MembershipStatus;
  userId: string;
  workspaceId: string;
  workspaceName?: string;
  joinedAt: string | null;
}

export interface ServiceResponse {
  id: string;
  name: string;
  description: string | null;
  startParam: string;
  slaMinutes: number;
  isActive: boolean;
  routingMode: string;
  version: number;
  links: {
    main: string;
    compact: string;
  };
}
```

- [ ] **Step 6: Create src/types/ticket.ts**

```typescript
import { TicketStatus, TicketPriority } from './enums';

export interface TicketResponse {
  id: string;
  ticketNumber: string;
  status: TicketStatus;
  priority: TicketPriority;
  title: string | null;
  summary: string | null;
  tags: string[];
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  slaDeadline: string | null;
  rating: number | null;
  ratingComment: string | null;
  version: number;
  serviceId: string;
  customerId: string;
  assigneeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketListItem extends TicketResponse {
  customerName: string;
  customerNumber: string;
  serviceName: string;
  assigneeName: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export interface TicketCounters {
  new: number;
  inProgress: number;
  waitingCustomer: number;
  slaOverdue: number;
}
```

- [ ] **Step 7: Create src/types/message.ts**

```typescript
import { MessageType, MessageAuthor, ScanStatus } from './enums';

export interface MessageResponse {
  id: string;
  type: MessageType;
  authorType: MessageAuthor;
  text: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  deliveredAt: string | null;
  readAt: string | null;
  eventSeq: number;
  version: number;
  authorUserId: string | null;
  authorName: string | null;
  ticketId: string;
  attachments: AttachmentResponse[];
  reactions: ReactionResponse[];
  createdAt: string;
}

export interface AttachmentResponse {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  previewUrl: string | null;
  scanStatus: ScanStatus;
  downloadUrl?: string;
  createdAt: string;
}

export interface ReactionResponse {
  emoji: string;
  count: number;
  userIds: string[];
  myReaction: boolean;
}

export interface UploadUrlResponse {
  attachmentId: string;
  uploadUrl: string;
  maxSize: number;
}
```

- [ ] **Step 8: Create src/types/socket-events.ts**

```typescript
import { MessageResponse } from './message';
import { TicketResponse } from './ticket';

// Client → Server
export interface ClientToServerEvents {
  join_ticket: (payload: { ticketId: string }, ack: (res: { ok: boolean; error?: string }) => void) => void;
  leave_ticket: (payload: { ticketId: string }) => void;
  'message:send': (payload: { ticketId: string; text: string; type: 'TEXT' | 'NOTE'; tempId: string }, ack: (res: { ok: boolean; message?: MessageResponse; error?: string }) => void) => void;
  'typing:start': (payload: { ticketId: string }) => void;
  'typing:stop': (payload: { ticketId: string }) => void;
  'message:read': (payload: { ticketId: string; messageId: string }) => void;
  'reaction:toggle': (payload: { messageId: string; emoji: string }) => void;
  heartbeat: () => void;
}

// Server → Client
export interface ServerToClientEvents {
  'message:new': (payload: MessageResponse) => void;
  'message:edited': (payload: { messageId: string; text: string; updatedAt: string }) => void;
  'message:deleted': (payload: { messageId: string }) => void;
  'typing:update': (payload: { ticketId: string; userId: string; userName: string; isTyping: boolean }) => void;
  'receipt:delivered': (payload: { ticketId: string; messageId: string; deliveredAt: string }) => void;
  'receipt:read': (payload: { ticketId: string; messageId: string; readAt: string; readByUserId: string }) => void;
  'ticket:updated': (payload: { ticketId: string; changes: Partial<TicketResponse> }) => void;
  'ticket:assigned': (payload: { ticketId: string; assigneeId: string; assigneeName: string }) => void;
  'notification:new': (payload: { type: string; title: string; body: string; ticketId?: string }) => void;
  'presence:update': (payload: { userId: string; status: 'online' | 'offline' }) => void;
  'attachment:ready': (payload: { attachmentId: string; ticketId: string; scanStatus: string; previewUrl: string | null }) => void;
}
```

- [ ] **Step 9: Create src/types/api.ts**

```typescript
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface CursorResponse<T> {
  data: T[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface ErrorResponse {
  status: number;
  code: ErrorCode;
  message: string;
  requestId: string;
  details?: { field: string; reason: string }[];
}

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'TICKET_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'WORKSPACE_NOT_FOUND'
  | 'SERVICE_NOT_FOUND'
  | 'MESSAGE_NOT_FOUND'
  | 'INVALID_INIT_DATA'
  | 'INIT_DATA_EXPIRED'
  | 'INIT_DATA_REPLAYED'
  | 'SESSION_EXPIRED'
  | 'SESSION_REVOKED'
  | 'FINGERPRINT_MISMATCH'
  | 'RATE_LIMIT_EXCEEDED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INVALID_STATE_TRANSITION'
  | 'EDIT_WINDOW_EXPIRED'
  | 'FILE_TYPE_NOT_ALLOWED'
  | 'FILE_TOO_LARGE'
  | 'IDEMPOTENCY_CONFLICT';
```

- [ ] **Step 10: Create src/constants/index.ts**

```typescript
export const LIMITS = {
  PAGE_DEFAULT: 20,
  PAGE_MAX: 100,
  MESSAGES_PAGE: 50,
  MESSAGE_MAX_LENGTH: 10_000,
  ATTACHMENT_MAX_SIZE: 50 * 1024 * 1024,
  ATTACHMENT_ALLOWED_MIMES: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
  ],
  ATTACHMENT_BLOCKED_EXTENSIONS: ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.scr', '.com', '.msi', '.dll'],
  MESSAGE_EDIT_WINDOW_MS: 5 * 60 * 1000,
  TYPING_DEBOUNCE_MS: 1000,
  TYPING_TIMEOUT_MS: 5000,
  TOKEN_REFRESH_INTERVAL_MS: 13 * 60 * 1000,
  SOCKET_RECONNECT_MAX_MS: 30_000,
  PRESENCE_TTL_SECONDS: 30,
  HEARTBEAT_INTERVAL_MS: 15_000,
} as const;

/** Valid ticket status transitions (from → allowed destinations) */
export const TICKET_TRANSITIONS: Record<string, string[]> = {
  NEW: ['IN_PROGRESS', 'SPAM', 'DUPLICATE'],
  IN_PROGRESS: ['WAITING_CUSTOMER', 'RESOLVED', 'SPAM', 'DUPLICATE'],
  WAITING_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'SPAM'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
  SPAM: [],
  DUPLICATE: [],
};
```

- [ ] **Step 11: Create src/validators/index.ts**

```typescript
import { z } from 'zod';
import { LIMITS } from '../constants';

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIMITS.PAGE_MAX).default(LIMITS.PAGE_DEFAULT),
});

export const cursorPaginationSchema = z.object({
  before: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(LIMITS.PAGE_MAX).default(LIMITS.MESSAGES_PAGE),
});

export const sendMessageSchema = z.object({
  text: z.string().min(1).max(LIMITS.MESSAGE_MAX_LENGTH),
  type: z.enum(['TEXT', 'NOTE']).default('TEXT'),
});

export const requestUploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().min(1).max(LIMITS.ATTACHMENT_MAX_SIZE),
});

export const rateTicketSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const createServiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  slaMinutes: z.number().int().min(1).max(10080).default(30),
  routingMode: z.enum(['manual', 'round_robin']).default('manual'),
});

export const createMacroSchema = z.object({
  name: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  category: z.string().max(100).optional(),
  sortOrder: z.number().int().default(0),
});

export const inviteTeamMemberSchema = z.object({
  telegramId: z.string().min(1),
  role: z.enum(['ADMIN', 'AGENT']),
});
```

- [ ] **Step 12: Create src/index.ts (barrel export)**

```typescript
export * from './types/enums';
export * from './types/user';
export * from './types/workspace';
export * from './types/ticket';
export * from './types/message';
export * from './types/socket-events';
export * from './types/api';
export * from './constants';
export * from './validators';
```

- [ ] **Step 13: Install and verify**

```bash
cd "c:/app crm chat/packages/shared"
pnpm install
pnpm typecheck
```

Expected: No errors.

- [ ] **Step 14: Commit**

```bash
git add packages/shared/
git commit -m "feat: add @crm/shared package with types, constants, and validators"
```

---

### Task 4: Scaffold NestJS backend

**Files:**
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `backend/tsconfig.build.json`
- Create: `backend/nest-cli.json`
- Create: `backend/src/main.ts`
- Create: `backend/src/app.module.ts`

- [ ] **Step 1: Create backend/package.json**

```json
{
  "name": "@crm/backend",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "nest build",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug 0.0.0.0:3001 --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \"src/**/*.ts\"",
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  },
  "dependencies": {
    "@crm/shared": "workspace:*",
    "@nestjs/common": "^10.4.0",
    "@nestjs/config": "^3.3.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/jwt": "^10.2.0",
    "@nestjs/passport": "^10.0.3",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/swagger": "^7.4.0",
    "@nestjs/websockets": "^10.4.0",
    "@nestjs/platform-socket.io": "^10.4.0",
    "@nestjs/bull": "^10.2.0",
    "@paralleldrive/cuid2": "^2.2.0",
    "@prisma/client": "^5.20.0",
    "bullmq": "^5.0.0",
    "class-transformer": "^0.5.1",
    "cookie-parser": "^1.4.6",
    "express-rate-limit": "^7.4.0",
    "helmet": "^7.1.0",
    "hpp": "^0.2.3",
    "ioredis": "^5.4.0",
    "minio": "^8.0.0",
    "nestjs-pino": "^4.1.0",
    "passport": "^0.7.0",
    "passport-jwt": "^4.0.1",
    "pino-http": "^10.3.0",
    "reflect-metadata": "^0.2.2",
    "rxjs": "^7.8.1",
    "sanitize-html": "^2.13.0",
    "uuid": "^10.0.0",
    "socket.io": "^4.8.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@nestjs/cli": "^10.4.0",
    "@nestjs/schematics": "^10.1.0",
    "@nestjs/testing": "^10.4.0",
    "@types/cookie-parser": "^1.4.7",
    "@types/express": "^4.17.21",
    "@types/hpp": "^0.2.6",
    "@types/jest": "^29.5.0",
    "@types/node": "^20.14.0",
    "@types/passport-jwt": "^4.0.1",
    "@types/sanitize-html": "^2.13.0",
    "@types/uuid": "^10.0.0",
    "pino-pretty": "^11.0.0",
    "jest": "^29.7.0",
    "prisma": "^5.20.0",
    "source-map-support": "^0.5.21",
    "ts-jest": "^29.2.0",
    "ts-loader": "^9.5.0",
    "ts-node": "^10.9.2",
    "typescript": "^5.5.4"
  },
  "jest": {
    "moduleFileExtensions": ["js", "json", "ts"],
    "rootDir": "src",
    "testRegex": ".*\\.spec\\.ts$",
    "transform": { "^.+\\.ts$": "ts-jest" },
    "collectCoverageFrom": ["**/*.ts", "!**/*.module.ts", "!main.ts"],
    "coverageDirectory": "../coverage",
    "testEnvironment": "node",
    "moduleNameMapper": {
      "^@crm/shared(.*)$": "<rootDir>/../../packages/shared/src$1"
    }
  },
  "prisma": {
    "seed": "ts-node --transpile-only prisma/seed.ts"
  }
}
```

- [ ] **Step 2: Create backend/tsconfig.json**

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "module": "CommonJS",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": "./",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "paths": {
      "@crm/shared": ["../packages/shared/src"],
      "@crm/shared/*": ["../packages/shared/src/*"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "test"]
}
```

- [ ] **Step 3: Create backend/tsconfig.build.json**

```json
{
  "extends": "./tsconfig.json",
  "exclude": ["node_modules", "dist", "test", "**/*.spec.ts"]
}
```

- [ ] **Step 4: Create backend/nest-cli.json**

```json
{
  "$schema": "https://json.schemastore.org/nest-cli",
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "tsConfigPath": "tsconfig.build.json"
  }
}
```

- [ ] **Step 5: Create backend/src/main.ts**

```typescript
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logger
  app.useLogger(app.get(Logger));

  // Security
  app.use(helmet());
  app.use(hpp());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
```

- [ ] **Step 6: Create backend/src/app.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.initData',
          'req.body.refreshToken',
        ],
      },
    }),
  ],
})
export class AppModule {}
```

- [ ] **Step 7: Install dependencies**

```bash
cd "c:/app crm chat/backend"
pnpm install
```

- [ ] **Step 8: Verify build**

```bash
cd "c:/app crm chat/backend"
pnpm build
```

Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add backend/
git commit -m "feat: scaffold NestJS backend with security middleware"
```

---

### Task 5: Prisma schema + migrations

**Files:**
- Create: `backend/prisma/schema.prisma`

- [ ] **Step 1: Create backend/prisma/schema.prisma**

Full schema from spec Section 3.2. This is the complete file:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  WORKSPACE_OWNER
  ADMIN
  AGENT
  CUSTOMER
}

enum TicketStatus {
  NEW
  IN_PROGRESS
  WAITING_CUSTOMER
  RESOLVED
  CLOSED
  SPAM
  DUPLICATE
}

enum TicketPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum MessageAuthor {
  CUSTOMER
  AGENT
  SYSTEM
}

enum MessageType {
  TEXT
  FILE
  NOTE
}

enum MembershipStatus {
  INVITED
  ACTIVE
  DEACTIVATED
}

enum ScanStatus {
  PENDING
  CLEAN
  INFECTED
}

model Workspace {
  id          String   @id @default(cuid())
  name        String
  slug        String   @unique
  botUsername  String?
  brandConfig Json     @default("{}")
  slaDefaults Json     @default("{}")
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

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
  id          String @id @default(cuid())
  counterType String
  lastValue   Int    @default(0)

  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  @@unique([workspaceId, counterType])
}

model Membership {
  id        String           @id @default(cuid())
  role      Role
  status    MembershipStatus @default(INVITED)
  joinedAt  DateTime?
  createdAt DateTime         @default(now())

  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Restrict)
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  assignedTickets Ticket[] @relation("AssignedAgent")

  @@unique([userId, workspaceId])
  @@index([workspaceId, role])
}

model User {
  id           String   @id @default(cuid())
  telegramId   BigInt   @unique
  username     String?
  firstName    String
  lastName     String?
  languageCode String?
  photoUrl     String?
  isBot        Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships      Membership[]
  customerProfiles CustomerProfile[]
  sessions         Session[]
  sentMessages     Message[]  @relation("MessageAuthor")
  reactions        Reaction[]
  auditLogs        AuditLog[] @relation("AuditActor")
}

model Session {
  id               String    @id @default(cuid())
  refreshTokenHash String    @unique
  fingerprint      String?
  expiresAt        DateTime
  revokedAt        DateTime?
  userAgent        String?
  ipAddress        String?
  createdAt        DateTime  @default(now())

  userId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model CustomerProfile {
  id           String    @id @default(cuid())
  clientNumber String
  segment      String?
  notes        String?
  isBanned     Boolean   @default(false)
  banReason    String?
  isDeleted    Boolean   @default(false)
  deletedAt    DateTime?
  customFields Json      @default("{}")
  version      Int       @default(1)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Restrict)
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  tickets Ticket[]

  @@unique([userId, workspaceId])
  @@unique([clientNumber, workspaceId])
  @@index([workspaceId, isDeleted])
}

model Service {
  id          String   @id @default(cuid())
  name        String
  description String?
  startParam  String   @unique
  slaMinutes  Int      @default(30)
  isActive    Boolean  @default(true)
  routingMode String   @default("manual")
  version     Int      @default(1)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  tickets Ticket[]

  @@index([workspaceId, isActive])
}

model Ticket {
  id              String         @id @default(cuid())
  ticketNumber    String
  status          TicketStatus   @default(NEW)
  priority        TicketPriority @default(NORMAL)
  title           String?
  summary         String?
  tags            String[]       @default([])
  firstResponseAt DateTime?
  resolvedAt      DateTime?
  closedAt        DateTime?
  slaDeadline     DateTime?
  rating          Int?
  ratingComment   String?
  isDeleted       Boolean        @default(false)
  deletedAt       DateTime?
  version         Int            @default(1)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  workspaceId String
  workspace   Workspace       @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
  serviceId   String
  service     Service         @relation(fields: [serviceId], references: [id], onDelete: Restrict)
  customerId  String
  customer    CustomerProfile @relation(fields: [customerId], references: [id], onDelete: Restrict)
  assigneeId  String?
  assignee    Membership?     @relation("AssignedAgent", fields: [assigneeId], references: [id], onDelete: SetNull)

  messages Message[]

  @@unique([ticketNumber, workspaceId])
  @@index([workspaceId, status, priority, updatedAt])
  @@index([workspaceId, assigneeId])
  @@index([workspaceId, serviceId])
  @@index([workspaceId, slaDeadline])
  @@index([customerId])
  @@index([workspaceId, isDeleted])
}

model Message {
  id          String        @id @default(cuid())
  type        MessageType   @default(TEXT)
  authorType  MessageAuthor
  text        String?
  isEdited    Boolean       @default(false)
  isDeleted   Boolean       @default(false)
  deliveredAt DateTime?
  readAt      DateTime?
  eventSeq    Int
  version     Int           @default(1)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  ticketId     String
  ticket       Ticket    @relation(fields: [ticketId], references: [id], onDelete: Restrict)
  workspaceId  String
  workspace    Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)
  authorUserId String?
  author       User?     @relation("MessageAuthor", fields: [authorUserId], references: [id], onDelete: SetNull)

  attachments Attachment[]
  reactions   Reaction[]

  @@index([ticketId, createdAt])
  @@index([ticketId, eventSeq])
  @@index([workspaceId, createdAt])
  @@index([authorUserId])
}

model Attachment {
  id           String     @id @default(cuid())
  storageKey   String
  originalName String
  mimeType     String
  sizeBytes    Int
  previewUrl   String?
  scanStatus   ScanStatus @default(PENDING)
  createdAt    DateTime   @default(now())

  messageId   String
  message     Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  workspaceId String

  @@index([messageId])
  @@index([workspaceId])
}

model Reaction {
  id        String   @id @default(cuid())
  emoji     String
  createdAt DateTime @default(now())

  messageId String
  message   Message @relation(fields: [messageId], references: [id], onDelete: Cascade)
  userId    String
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([messageId, userId, emoji])
}

model CustomFieldDef {
  id         String   @id @default(cuid())
  name       String
  label      String
  fieldType  String
  options    Json?
  isRequired Boolean  @default(false)
  sortOrder  Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  @@unique([workspaceId, name])
}

model Macro {
  id        String   @id @default(cuid())
  name      String
  content   String
  category  String?
  sortOrder Int      @default(0)
  version   Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  @@index([workspaceId])
}

model AuditLog {
  id         String   @id @default(cuid())
  action     String
  entityType String
  entityId   String
  oldValue   Json?
  newValue   Json?
  ipAddress  String?
  userAgent  String?
  createdAt  DateTime @default(now())

  userId      String?
  actor       User?     @relation("AuditActor", fields: [userId], references: [id], onDelete: SetNull)
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Restrict)

  @@index([workspaceId, createdAt])
  @@index([entityType, entityId])
  @@index([userId])
}
```

- [ ] **Step 2: Generate initial migration**

```bash
cd "c:/app crm chat/backend"
npx prisma migrate dev --name init
```

Expected: Migration created successfully, Prisma Client generated.

- [ ] **Step 3: Add CHECK constraints via custom SQL migration**

Create file `backend/prisma/migrations/<timestamp>_add_checks/migration.sql`:

```sql
ALTER TABLE "Ticket" ADD CONSTRAINT "ticket_rating_range" CHECK ("rating" >= 1 AND "rating" <= 5);
ALTER TABLE "Attachment" ADD CONSTRAINT "attachment_size_positive" CHECK ("sizeBytes" >= 0);
CREATE INDEX idx_ticket_tags ON "Ticket" USING GIN ("tags");
```

Then apply:

```bash
npx prisma migrate dev --name add_checks
```

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/
git commit -m "feat: add Prisma schema with all models, migrations, and CHECK constraints"
```

---

### Task 6: PrismaModule (infrastructure)

**Files:**
- Create: `backend/src/infrastructure/prisma/prisma.module.ts`
- Create: `backend/src/infrastructure/prisma/prisma.service.ts`

- [ ] **Step 1: Create prisma.service.ts**

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

- [ ] **Step 2: Create prisma.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

- [ ] **Step 3: Add PrismaModule to AppModule imports**

Update `backend/src/app.module.ts` — add the import and insert `PrismaModule` into the imports array:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './infrastructure/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.initData',
          'req.body.refreshToken',
        ],
      },
    }),
    PrismaModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/infrastructure/prisma/
git commit -m "feat: add PrismaModule as global DB service"
```

---

### Task 7: RedisModule (infrastructure)

**Files:**
- Create: `backend/src/infrastructure/redis/redis.module.ts`
- Create: `backend/src/infrastructure/redis/redis.service.ts`

- [ ] **Step 1: Create redis.service.ts**

```typescript
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super(config.getOrThrow<string>('REDIS_URL'));
  }

  async onModuleDestroy() {
    await this.quit();
  }
}
```

- [ ] **Step 2: Create redis.module.ts**

```typescript
import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
```

- [ ] **Step 3: Add RedisModule to AppModule**

Update `backend/src/app.module.ts` — add the import and insert `RedisModule`:

```typescript
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({ /* ... same as before ... */ }),
    PrismaModule,
    RedisModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/infrastructure/redis/
git commit -m "feat: add RedisModule for caching and presence"
```

---

### Task 8: Docker Compose

**Files:**
- Create: `docker-compose.yml`
- Create: `docker-compose.override.yml`

- [ ] **Step 1: Create docker-compose.yml**

Full compose file from spec Section 7.1 with corrected MinIO healthcheck (curl instead of mc):

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: crm
      POSTGRES_USER: crm
      POSTGRES_PASSWORD: ${DB_PASSWORD:-crm_dev_pass}
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U crm"]
      interval: 5s
      timeout: 3s
      retries: 5

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 128mb --maxmemory-policy allkeys-lru --appendonly yes --appendfsync everysec
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-minioadmin}
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - miniodata:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 5s
      timeout: 3s
      retries: 5

  minio-init:
    image: minio/mc:latest
    depends_on:
      minio:
        condition: service_healthy
    entrypoint: >
      /bin/sh -c "
      mc alias set local http://minio:9000 minioadmin minioadmin;
      mc mb --ignore-existing local/crm-attachments;
      mc anonymous set none local/crm-attachments;
      exit 0;
      "

volumes:
  pgdata:
  redisdata:
  miniodata:
```

- [ ] **Step 2: Create docker-compose.override.yml**

```yaml
# Dev-only overrides
services:
  postgres:
    ports:
      - "5432:5432"
```

- [ ] **Step 3: Test infrastructure starts**

```bash
cd "c:/app crm chat"
docker compose up -d postgres redis minio minio-init
docker compose ps
```

Expected: All services healthy.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml docker-compose.override.yml
git commit -m "feat: add Docker Compose with Postgres, Redis, MinIO"
```

---

### Task 9: Seed data

**Files:**
- Create: `backend/prisma/seed.ts`

- [ ] **Step 1: Create seed.ts**

```typescript
import { PrismaClient } from '@prisma/client';
import { createId } from '@paralleldrive/cuid2';

const prisma = new PrismaClient();

async function main() {
  // Idempotent: skip if already seeded
  const existing = await prisma.workspace.findUnique({
    where: { slug: 'demo-support' },
  });
  if (existing) {
    console.log('Seed data already exists, skipping');
    return;
  }

  const workspaceId = createId();
  const adminUserId = createId();
  const agentUserId = createId();
  const customerUserId = createId();

  // Workspace
  await prisma.workspace.create({
    data: {
      id: workspaceId,
      name: 'Demo Support',
      slug: 'demo-support',
      botUsername: process.env.BOT_USERNAME || 'demo_bot',
      brandConfig: { theme: 'dark', accent: '#2ea6ff' },
      slaDefaults: { LOW: 120, NORMAL: 30, HIGH: 15, URGENT: 5 },
    },
  });

  // Counters
  await prisma.workspaceCounter.createMany({
    data: [
      { workspaceId, counterType: 'client', lastValue: 1 },
      { workspaceId, counterType: 'ticket', lastValue: 3 },
    ],
  });

  // Users
  await prisma.user.createMany({
    data: [
      { id: adminUserId, telegramId: BigInt(100000001), firstName: 'Admin', username: 'demo_admin' },
      { id: agentUserId, telegramId: BigInt(100000002), firstName: 'Agent', lastName: 'Maria', username: 'demo_agent' },
      { id: customerUserId, telegramId: BigInt(100000003), firstName: 'Customer', username: 'demo_customer' },
    ],
  });

  // Memberships
  const adminMembershipId = createId();
  const agentMembershipId = createId();
  await prisma.membership.createMany({
    data: [
      { id: adminMembershipId, userId: adminUserId, workspaceId, role: 'WORKSPACE_OWNER', status: 'ACTIVE', joinedAt: new Date() },
      { id: agentMembershipId, userId: agentUserId, workspaceId, role: 'AGENT', status: 'ACTIVE', joinedAt: new Date() },
      { userId: customerUserId, workspaceId, role: 'CUSTOMER', status: 'ACTIVE', joinedAt: new Date() },
    ],
  });

  // Customer profile
  const customerProfileId = createId();
  await prisma.customerProfile.create({
    data: {
      id: customerProfileId,
      userId: customerUserId,
      workspaceId,
      clientNumber: 'C-000001',
    },
  });

  // Services
  const service1Id = createId();
  await prisma.service.createMany({
    data: [
      { id: service1Id, workspaceId, name: 'General Support', startParam: createId(), slaMinutes: 30, routingMode: 'round_robin' },
      { workspaceId, name: 'Returns & Refunds', startParam: createId(), slaMinutes: 60, routingMode: 'manual' },
      { workspaceId, name: 'VIP Support', startParam: createId(), slaMinutes: 5, routingMode: 'manual' },
    ],
  });

  // Tickets
  const ticket1Id = createId();
  await prisma.ticket.createMany({
    data: [
      {
        id: ticket1Id,
        workspaceId,
        serviceId: service1Id,
        customerId: customerProfileId,
        assigneeId: agentMembershipId,
        ticketNumber: 'T-2026-000001',
        status: 'IN_PROGRESS',
        slaDeadline: new Date(Date.now() + 30 * 60 * 1000),
      },
      {
        workspaceId,
        serviceId: service1Id,
        customerId: customerProfileId,
        ticketNumber: 'T-2026-000002',
        status: 'NEW',
        slaDeadline: new Date(Date.now() + 30 * 60 * 1000),
      },
      {
        workspaceId,
        serviceId: service1Id,
        customerId: customerProfileId,
        assigneeId: agentMembershipId,
        ticketNumber: 'T-2026-000003',
        status: 'RESOLVED',
        resolvedAt: new Date(),
        rating: 5,
        ratingComment: 'Great support!',
      },
    ],
  });

  // Messages for ticket 1
  await prisma.message.createMany({
    data: [
      { ticketId: ticket1Id, workspaceId, authorType: 'CUSTOMER', authorUserId: customerUserId, type: 'TEXT', text: 'Hello, I need help with my order', eventSeq: 1 },
      { ticketId: ticket1Id, workspaceId, authorType: 'SYSTEM', type: 'TEXT', text: 'Agent Maria joined the conversation', eventSeq: 2 },
      { ticketId: ticket1Id, workspaceId, authorType: 'AGENT', authorUserId: agentUserId, type: 'TEXT', text: 'Hi! I would be happy to help. What is your order number?', eventSeq: 3 },
      { ticketId: ticket1Id, workspaceId, authorType: 'AGENT', authorUserId: agentUserId, type: 'NOTE', text: 'Customer seems to have issue with delayed delivery', eventSeq: 4 },
    ],
  });

  // Macros
  await prisma.macro.createMany({
    data: [
      { workspaceId, name: 'Greeting', content: 'Hello, {clientNumber}! How can I help you today?', category: 'general' },
      { workspaceId, name: 'Request Details', content: 'Could you please provide more details about your issue?', category: 'general' },
      { workspaceId, name: 'Closing', content: 'Glad I could help! If you have any other questions, feel free to ask.', category: 'closing' },
    ],
  });

  // Custom field definitions
  await prisma.customFieldDef.createMany({
    data: [
      { workspaceId, name: 'city', label: 'City', fieldType: 'text' },
      { workspaceId, name: 'vip_level', label: 'VIP Level', fieldType: 'select', options: ['Standard', 'Gold', 'Platinum'] },
      { workspaceId, name: 'last_purchase_date', label: 'Last Purchase Date', fieldType: 'date' },
    ],
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run seed**

```bash
cd "c:/app crm chat/backend"
npx prisma db seed
```

Expected: "Seed data created successfully"

- [ ] **Step 3: Verify with Prisma Studio**

```bash
npx prisma studio
```

Check that all tables have data.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/seed.ts
git commit -m "feat: add seed data with demo workspace, users, tickets, macros"
```

---

## Chunk 2: Auth Module

### Task 10: Telegram initData verification service

**Files:**
- Create: `backend/src/auth/service/telegram-verify.service.ts`
- Create: `backend/src/auth/service/telegram-verify.service.spec.ts`

- [ ] **Step 1: Write tests for Telegram verification**

```typescript
// backend/src/auth/service/telegram-verify.service.spec.ts
import { createHmac } from 'crypto';
import { TelegramVerifyService } from './telegram-verify.service';

describe('TelegramVerifyService', () => {
  const BOT_TOKEN = 'test:bot_token_for_testing';
  let service: TelegramVerifyService;

  beforeEach(() => {
    service = new TelegramVerifyService(BOT_TOKEN);
  });

  function createValidInitData(overrides: Record<string, string> = {}): string {
    const data: Record<string, string> = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 123456, first_name: 'Test', username: 'testuser' }),
      ...overrides,
    };

    const secret = createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const checkString = Object.keys(data)
      .sort()
      .map((k) => `${k}=${data[k]}`)
      .join('\n');
    const hash = createHmac('sha256', secret).update(checkString).digest('hex');

    return new URLSearchParams({ ...data, hash }).toString();
  }

  it('should verify valid initData', () => {
    const initData = createValidInitData();
    const result = service.verify(initData, 300);
    expect(result.user.id).toBe(123456);
    expect(result.user.first_name).toBe('Test');
  });

  it('should reject tampered hash', () => {
    const initData = createValidInitData();
    const tampered = initData.replace(/hash=[^&]+/, 'hash=deadbeef');
    expect(() => service.verify(tampered, 300)).toThrow('INVALID_INIT_DATA');
  });

  it('should reject expired auth_date', () => {
    const expired = String(Math.floor(Date.now() / 1000) - 600);
    const initData = createValidInitData({ auth_date: expired });
    expect(() => service.verify(initData, 300)).toThrow('INIT_DATA_EXPIRED');
  });

  it('should reject future auth_date', () => {
    const future = String(Math.floor(Date.now() / 1000) + 600);
    const initData = createValidInitData({ auth_date: future });
    expect(() => service.verify(initData, 300)).toThrow('INVALID_INIT_DATA');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "c:/app crm chat/backend"
pnpm test -- --testPathPattern="telegram-verify"
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement TelegramVerifyService**

```typescript
// backend/src/auth/service/telegram-verify.service.ts
import { createHmac, timingSafeEqual } from 'crypto';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
  is_bot?: boolean;
}

export interface VerifyResult {
  user: TelegramUser;
  authDate: number;
  hash: string;
  startParam?: string;
}

export class TelegramVerifyService {
  private readonly secretKey: Buffer;

  constructor(botToken: string) {
    this.secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
  }

  verify(initData: string, ttlSeconds: number): VerifyResult {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) throw new Error('INVALID_INIT_DATA');

    // Build data check string
    const entries: string[] = [];
    params.forEach((value, key) => {
      if (key !== 'hash') entries.push(`${key}=${value}`);
    });
    entries.sort();
    const dataCheckString = entries.join('\n');

    // Compute and compare hash
    const computed = createHmac('sha256', this.secretKey).update(dataCheckString).digest('hex');

    const computedBuf = Buffer.from(computed, 'hex');
    const receivedBuf = Buffer.from(hash, 'hex');
    if (computedBuf.length !== receivedBuf.length || !timingSafeEqual(computedBuf, receivedBuf)) {
      throw new Error('INVALID_INIT_DATA');
    }

    // Check auth_date
    const authDate = Number(params.get('auth_date'));
    const now = Math.floor(Date.now() / 1000);
    if (authDate > now + 60) throw new Error('INVALID_INIT_DATA'); // future (with 60s tolerance)
    if (now - authDate > ttlSeconds) throw new Error('INIT_DATA_EXPIRED');

    // Parse user
    const userStr = params.get('user');
    if (!userStr) throw new Error('INVALID_INIT_DATA');
    const user: TelegramUser = JSON.parse(userStr);

    return {
      user,
      authDate,
      hash,
      startParam: params.get('start_param') || undefined,
    };
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern="telegram-verify"
```

Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/
git commit -m "feat: add TelegramVerifyService with HMAC-SHA256 validation"
```

---

### Task 11: Auth module — controller, JWT, session management

**Files:**
- Create: `backend/src/auth/auth.module.ts`
- Create: `backend/src/auth/controller/auth.controller.ts`
- Create: `backend/src/auth/service/auth.service.ts`
- Create: `backend/src/auth/service/session.service.ts`
- Create: `backend/src/auth/dto/telegram-auth.dto.ts`
- Create: `backend/src/auth/dto/token-response.dto.ts`
- Create: `backend/src/auth/guards/jwt-auth.guard.ts`
- Create: `backend/src/auth/strategies/jwt.strategy.ts`

- [ ] **Step 1: Create dto/telegram-auth.dto.ts**

```typescript
import { z } from 'zod';

export const telegramAuthSchema = z.object({
  initData: z.string().min(1),
  startParam: z.string().optional(),
});

export type TelegramAuthDto = z.infer<typeof telegramAuthSchema>;
```

- [ ] **Step 2: Create dto/token-response.dto.ts**

```typescript
import { UserResponse, WorkspaceResponse, ServiceResponse } from '@crm/shared';

export interface AuthResponse {
  accessToken: string;
  user: UserResponse;
  workspace: WorkspaceResponse | null;
  service: ServiceResponse | null;
  clientNumber: string | null;
  ticketNumber: string | null;
  role: string;
}
```

- [ ] **Step 3: Create service/session.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class SessionService {
  private readonly pepper: string;
  private readonly pepperPrevious: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.pepper = config.getOrThrow<string>('REFRESH_TOKEN_PEPPER');
    this.pepperPrevious = config.get<string>('REFRESH_TOKEN_PEPPER_PREVIOUS');
  }

  generateRefreshToken(): string {
    return randomBytes(32).toString('hex');
  }

  hashToken(token: string, pepper?: string): string {
    return createHash('sha256')
      .update(token + (pepper || this.pepper))
      .digest('hex');
  }

  async createSession(userId: string, refreshToken: string, fingerprint?: string, ua?: string, ip?: string) {
    const hash = this.hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    return this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: hash,
        fingerprint,
        expiresAt,
        userAgent: ua,
        ipAddress: ip,
      },
    });
  }

  async validateAndRotate(refreshToken: string, fingerprint?: string) {
    // Try current pepper
    let hash = this.hashToken(refreshToken);
    let session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    let needsRehash = false;

    // Try previous pepper if current didn't match
    if (!session && this.pepperPrevious) {
      hash = this.hashToken(refreshToken, this.pepperPrevious);
      session = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
      needsRehash = !!session;
    }

    if (!session) throw new Error('SESSION_EXPIRED');
    if (session.revokedAt) {
      // Theft detected — revoke all sessions for this user
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new Error('SESSION_REVOKED');
    }
    if (session.expiresAt < new Date()) throw new Error('SESSION_EXPIRED');
    if (fingerprint && session.fingerprint && session.fingerprint !== fingerprint) {
      throw new Error('FINGERPRINT_MISMATCH');
    }

    // Revoke old session
    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    // Re-hash with current pepper if needed (pepper rotation)
    if (needsRehash) {
      // Session already revoked above — new session will use current pepper
    }

    // Generate new refresh token and session
    const newRefreshToken = this.generateRefreshToken();
    const newSession = await this.createSession(
      session.userId,
      newRefreshToken,
      session.fingerprint || undefined,
      session.userAgent || undefined,
      session.ipAddress || undefined,
    );

    return { session: newSession, refreshToken: newRefreshToken, userId: session.userId };
  }

  async revokeSession(refreshTokenHash: string) {
    await this.prisma.session.updateMany({
      where: { refreshTokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revoke session by raw (unhashed) refresh token — handles pepper internally */
  async revokeByRawToken(rawToken: string) {
    // Try current pepper
    let hash = this.hashToken(rawToken);
    let found = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });

    // Try previous pepper
    if (!found && this.pepperPrevious) {
      hash = this.hashToken(rawToken, this.pepperPrevious);
      found = await this.prisma.session.findUnique({ where: { refreshTokenHash: hash } });
    }

    if (found && !found.revokedAt) {
      await this.prisma.session.update({
        where: { id: found.id },
        data: { revokedAt: new Date() },
      });
    }
  }

  async revokeAllUserSessions(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
```

- [ ] **Step 4: Create service/auth.service.ts**

```typescript
import { Injectable, UnauthorizedException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { TelegramVerifyService, TelegramUser } from './telegram-verify.service';
import { SessionService } from './session.service';
import { TelegramAuthDto } from '../dto/telegram-auth.dto';
import { AuthResponse } from '../dto/token-response.dto';
import { computeFingerprint } from '../../common/utils/fingerprint';

@Injectable()
export class AuthService {
  private readonly telegramVerify: TelegramVerifyService;
  private readonly authDateTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly sessions: SessionService,
    private readonly config: ConfigService,
  ) {
    this.telegramVerify = new TelegramVerifyService(config.getOrThrow('BOT_TOKEN'));
    this.authDateTtl = Number(config.get('AUTH_DATE_TTL_SECONDS', '300'));
  }

  async authenticateTelegram(dto: TelegramAuthDto, ua?: string, ip?: string): Promise<{ auth: AuthResponse; refreshToken: string }> {
    // Phase 1: Validate initData
    let result;
    try {
      result = this.telegramVerify.verify(dto.initData, this.authDateTtl);
    } catch (e: any) {
      throw new UnauthorizedException(e.message);
    }

    // Anti-replay
    const replayKey = `initdata:${result.hash}`;
    const isNew = await this.redis.set(replayKey, '1', 'EX', this.authDateTtl, 'NX');
    if (!isNew) throw new UnauthorizedException('INIT_DATA_REPLAYED');

    // Phase 2: Resolve startParam
    const startParam = dto.startParam || result.startParam;
    let service = null;
    let workspace = null;

    if (startParam) {
      service = await this.prisma.service.findFirst({
        where: { startParam, isActive: true },
        include: { workspace: true },
      });
      if (!service) throw new NotFoundException('SERVICE_NOT_FOUND');
      workspace = service.workspace;
    }

    // Phase 3: User + role resolution (transaction)
    const txResult = await this.prisma.$transaction(async (tx) => {
      // Upsert user
      const user = await tx.user.upsert({
        where: { telegramId: BigInt(result.user.id) },
        create: {
          telegramId: BigInt(result.user.id),
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          username: result.user.username,
          languageCode: result.user.language_code,
          photoUrl: result.user.photo_url,
          isBot: result.user.is_bot || false,
        },
        update: {
          firstName: result.user.first_name,
          lastName: result.user.last_name,
          username: result.user.username,
          languageCode: result.user.language_code,
          photoUrl: result.user.photo_url,
        },
      });

      if (!workspace) {
        return { user, role: 'CUSTOMER' as const, membership: null, customerProfile: null, ticket: null };
      }

      // Check membership
      const membership = await tx.membership.findUnique({
        where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
      });

      if (membership && membership.role !== 'CUSTOMER') {
        // Agent/Admin path
        if (membership.status === 'DEACTIVATED') {
          throw new ForbiddenException('FORBIDDEN');
        }
        if (membership.status === 'INVITED') {
          await tx.membership.update({
            where: { id: membership.id },
            data: { status: 'ACTIVE', joinedAt: new Date() },
          });
        }
        return { user, role: membership.role, membership, customerProfile: null, ticket: null };
      }

      // Customer path
      let customerProfile = await tx.customerProfile.findUnique({
        where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
      });

      if (!customerProfile) {
        // Generate client number atomically
        const [counter] = await tx.$queryRaw<{ lastValue: number }[]>`
          SELECT "lastValue" FROM "WorkspaceCounter"
          WHERE "workspaceId" = ${workspace.id} AND "counterType" = 'client'
          FOR UPDATE
        `;
        const nextClient = (counter?.lastValue ?? 0) + 1;
        await tx.$queryRaw`
          UPDATE "WorkspaceCounter" SET "lastValue" = ${nextClient}
          WHERE "workspaceId" = ${workspace.id} AND "counterType" = 'client'
        `;
        const clientNumber = `C-${String(nextClient).padStart(6, '0')}`;

        customerProfile = await tx.customerProfile.create({
          data: { userId: user.id, workspaceId: workspace.id, clientNumber },
        });

        // Create customer membership
        await tx.membership.upsert({
          where: { userId_workspaceId: { userId: user.id, workspaceId: workspace.id } },
          create: { userId: user.id, workspaceId: workspace.id, role: 'CUSTOMER', status: 'ACTIVE', joinedAt: new Date() },
          update: {},
        });
      }

      // Find or create ticket
      let ticket = await tx.ticket.findFirst({
        where: {
          customerId: customerProfile.id,
          serviceId: service!.id,
          status: { notIn: ['CLOSED', 'SPAM', 'DUPLICATE'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!ticket) {
        const [tCounter] = await tx.$queryRaw<{ lastValue: number }[]>`
          SELECT "lastValue" FROM "WorkspaceCounter"
          WHERE "workspaceId" = ${workspace.id} AND "counterType" = 'ticket'
          FOR UPDATE
        `;
        const nextTicket = (tCounter?.lastValue ?? 0) + 1;
        await tx.$queryRaw`
          UPDATE "WorkspaceCounter" SET "lastValue" = ${nextTicket}
          WHERE "workspaceId" = ${workspace.id} AND "counterType" = 'ticket'
        `;
        const year = new Date().getFullYear();
        const ticketNumber = `T-${year}-${String(nextTicket).padStart(6, '0')}`;

        ticket = await tx.ticket.create({
          data: {
            workspaceId: workspace.id,
            serviceId: service!.id,
            customerId: customerProfile.id,
            ticketNumber,
            slaDeadline: new Date(Date.now() + service!.slaMinutes * 60 * 1000),
          },
        });
      }

      return { user, role: 'CUSTOMER' as const, membership: null, customerProfile, ticket };
    });

    // Phase 4: Session
    const fingerprint = computeFingerprint(ua, ip);

    const accessToken = this.jwt.sign({
      sub: txResult.user.id,
      role: txResult.role,
      wid: workspace?.id,
    });

    const refreshToken = this.sessions.generateRefreshToken();
    await this.sessions.createSession(txResult.user.id, refreshToken, fingerprint, ua, ip);

    const auth: AuthResponse = {
      accessToken,
      user: {
        id: txResult.user.id,
        telegramId: txResult.user.telegramId.toString(),
        username: txResult.user.username,
        firstName: txResult.user.firstName,
        lastName: txResult.user.lastName,
        languageCode: txResult.user.languageCode,
        photoUrl: txResult.user.photoUrl,
        createdAt: txResult.user.createdAt.toISOString(),
      },
      workspace: workspace ? {
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        botUsername: workspace.botUsername,
        brandConfig: workspace.brandConfig as Record<string, unknown>,
        slaDefaults: workspace.slaDefaults as Record<string, number>,
        createdAt: workspace.createdAt.toISOString(),
      } : null,
      service: service ? {
        id: service.id,
        name: service.name,
        description: service.description,
        startParam: service.startParam,
        slaMinutes: service.slaMinutes,
        isActive: service.isActive,
        routingMode: service.routingMode,
        version: service.version,
        links: {
          main: `t.me/${workspace?.botUsername}?startapp=${service.startParam}`,
          compact: `t.me/${workspace?.botUsername}?startapp=${service.startParam}&mode=compact`,
        },
      } : null,
      clientNumber: txResult.customerProfile?.clientNumber ?? null,
      ticketNumber: txResult.ticket?.ticketNumber ?? null,
      role: txResult.role,
    };

    return { auth, refreshToken };
  }

  /** Generate a fresh access token for an existing user (used by refresh endpoint) */
  async generateAccessTokenForUser(userId: string): Promise<string> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // Find the user's active membership to determine role and workspace
    const membership = await this.prisma.membership.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    });

    return this.jwt.sign({
      sub: user.id,
      role: membership?.role || 'CUSTOMER',
      wid: membership?.workspaceId,
    });
  }
}
```

- [ ] **Step 5: Create guards/jwt-auth.guard.ts**

```typescript
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly secrets: string[];

  constructor(
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    super();
    const current = config.getOrThrow<string>('JWT_SECRET');
    const previous = config.get<string>('JWT_SECRET_PREVIOUS');
    this.secrets = previous ? [current, previous] : [current];
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('SESSION_EXPIRED');
    }
    const token = authHeader.slice(7);

    // Try each secret (current first, then previous for rotation)
    for (const secret of this.secrets) {
      try {
        const payload = this.jwtService.verify(token, { secret });
        req.user = { userId: payload.sub, role: payload.role, workspaceId: payload.wid };
        return true;
      } catch {
        continue;
      }
    }

    throw new UnauthorizedException('SESSION_EXPIRED');
  }
}
```

- [ ] **Step 6: Create strategies/jwt.strategy.ts**

> **Note:** HTTP requests use the custom `JwtAuthGuard` (Step 5) which handles multi-key
> rotation directly. This Passport strategy is kept as a fallback for Socket.IO
> `@UseGuards(AuthGuard('jwt'))` in the WebSocket gateway (Chunk 4).

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  role: string;
  wid?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return { userId: payload.sub, role: payload.role, workspaceId: payload.wid };
  }
}
```

- [ ] **Step 6b: Create common/utils/fingerprint.ts (shared utility)**

```typescript
import { createHash } from 'crypto';

/**
 * Generate session fingerprint from user agent and IP subnet.
 * IPv4: uses /24 subnet. IPv6: uses first 3 groups.
 */
export function computeFingerprint(userAgent?: string, ip?: string): string | undefined {
  if (!userAgent || !ip) return undefined;
  const subnet = ip.includes(':')
    ? ip.split(':').slice(0, 3).join(':')
    : ip.split('.').slice(0, 3).join('.');
  return createHash('sha256').update(userAgent + subnet).digest('hex');
}
```

- [ ] **Step 7: Create controller/auth.controller.ts**

```typescript
import { Controller, Post, Body, Req, Res, UseGuards, HttpCode } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from '../service/auth.service';
import { SessionService } from '../service/session.service';
import { telegramAuthSchema } from '../dto/telegram-auth.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { computeFingerprint } from '../../common/utils/fingerprint';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Post('telegram')
  async telegram(@Body() body: unknown, @Req() req: Request, @Res() res: Response) {
    const dto = telegramAuthSchema.parse(body);
    const ua = req.headers['user-agent'];
    const ip = req.ip;
    const { auth, refreshToken } = await this.auth.authenticateTelegram(dto, ua, ip);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    return res.json(auth);
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies?.refreshToken;
    if (!token) return res.status(401).json({ code: 'SESSION_EXPIRED' });

    const fingerprint = computeFingerprint(req.headers['user-agent'], req.ip);

    try {
      const result = await this.sessions.validateAndRotate(token, fingerprint);
      const accessToken = await this.auth.generateAccessTokenForUser(result.userId);

      res.cookie('refreshToken', result.refreshToken, COOKIE_OPTIONS);
      return res.json({ accessToken });
    } catch (e: any) {
      return res.status(401).json({ code: e.message });
    }
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res() res: Response) {
    const token = req.cookies?.refreshToken;
    if (token) {
      // Use SessionService to hash with pepper (not raw hash)
      await this.sessions.revokeByRawToken(token);
    }
    res.clearCookie('refreshToken', { path: '/api' });
    return res.send();
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(204)
  async logoutAll(@Req() req: any, @Res() res: Response) {
    await this.sessions.revokeAllUserSessions(req.user.userId);
    res.clearCookie('refreshToken', { path: '/api' });
    return res.send();
  }
}
```

- [ ] **Step 8: Create auth.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { SessionService } from './service/session.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_ACCESS_TTL', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, JwtStrategy],
  exports: [AuthService, SessionService, JwtModule],
})
export class AuthModule {}
```

- [ ] **Step 9: Add AuthModule to AppModule**

Update `backend/src/app.module.ts` — add the import and insert `AuthModule`:

```typescript
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({ /* ... same as before ... */ }),
    PrismaModule,
    RedisModule,
    AuthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 10: Commit**

```bash
git add backend/src/auth/
git commit -m "feat: add auth module with Telegram initData verification, JWT, session management"
```

---

### Task 12: Common guards and decorators

**Files:**
- Create: `backend/src/common/decorators/current-user.decorator.ts`
- Create: `backend/src/common/decorators/roles.decorator.ts`
- Create: `backend/src/common/guards/roles.guard.ts`
- Create: `backend/src/common/guards/workspace-scope.guard.ts`
- Create: `backend/src/common/middleware/correlation-id.middleware.ts`
- Create: `backend/src/common/filters/global-exception.filter.ts`
- Create: `backend/src/common/pipes/zod-validation.pipe.ts`
- Create: `backend/src/common/interceptors/audit-log.interceptor.ts`
- Create: `backend/src/common/interceptors/transform.interceptor.ts`
- Create: `backend/src/common/health/health.controller.ts`
- Modify: `backend/src/app.module.ts` (register middleware, filters, interceptors, health)
- Modify: `backend/src/main.ts` (add rate limiting)

- [ ] **Step 1: Create current-user.decorator.ts**

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  userId: string;
  role: string;
  workspaceId?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserData | undefined, ctx: ExecutionContext): CurrentUserData | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserData;
    return data ? user?.[data] : user;
  },
);
```

- [ ] **Step 2: Create roles.decorator.ts**

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

- [ ] **Step 3: Create roles.guard.ts**

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('FORBIDDEN');
    }
    return true;
  }
}
```

- [ ] **Step 4: Create workspace-scope.guard.ts**

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

/**
 * Ensures the :wid route param matches the JWT's workspaceId.
 * Attach AFTER JwtAuthGuard on any workspace-scoped controller.
 */
@Injectable()
export class WorkspaceScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    const paramWid = req.params?.wid;

    if (!paramWid) return true; // no :wid param, skip

    if (user.workspaceId && user.workspaceId !== paramWid) {
      throw new ForbiddenException('FORBIDDEN');
    }

    // Attach resolved workspaceId for downstream use
    req.workspaceId = paramWid;
    return true;
  }
}
```

- [ ] **Step 5: Create common/middleware/correlation-id.middleware.ts**

```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

/**
 * Generates x-request-id for every request (or preserves incoming one).
 * Attaches to request AND response headers for end-to-end tracing.
 */
@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || uuid();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  }
}
```

- [ ] **Step 6: Create global-exception.filter.ts**

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    // Use correlation ID from middleware (already set on req)
    const requestId = req.headers['x-request-id'] as string;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'An unexpected error occurred';
    let details: { field: string; reason: string }[] | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === 'string') {
        code = response;
        message = response;
      } else if (typeof response === 'object' && response !== null) {
        const obj = response as Record<string, any>;
        code = obj.code || obj.message || code;
        message = obj.message || message;
        details = obj.details;
      }
    }

    if (status >= 500) {
      this.logger.error({ err: exception, requestId, url: req.url }, 'Unhandled exception');
    }

    res.status(status).json({ status, code, message, requestId, ...(details ? { details } : {}) });
  }
}
```

- [ ] **Step 7: Create zod-validation.pipe.ts**

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema, ZodError } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema: ZodSchema) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            reason: e.message,
          })),
        });
      }
      throw error;
    }
  }
}
```

- [ ] **Step 8: Create audit-log.interceptor.ts**

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;

    // Only audit mutations
    if (!['POST', 'PATCH', 'PUT', 'DELETE'].includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (responseBody) => {
        try {
          const user = req.user;
          const workspaceId = req.params?.wid || user?.workspaceId;
          if (!workspaceId) return;

          await this.prisma.auditLog.create({
            data: {
              action: `${req.method} ${req.route?.path || req.url}`,
              entityType: this.extractEntityType(req.route?.path || req.url),
              entityId: req.params?.tid || req.params?.mid || req.params?.sid || req.params?.cid || '',
              userId: user?.userId,
              workspaceId,
              ipAddress: req.ip,
              userAgent: req.headers['user-agent'],
            },
          });
        } catch {
          // Audit logging should never break the request
        }
      }),
    );
  }

  private extractEntityType(path: string): string {
    if (path.includes('ticket')) return 'ticket';
    if (path.includes('message')) return 'message';
    if (path.includes('customer')) return 'customer';
    if (path.includes('service')) return 'service';
    if (path.includes('team')) return 'team';
    if (path.includes('macro')) return 'macro';
    return 'unknown';
  }
}
```

- [ ] **Step 9: Create common/interceptors/transform.interceptor.ts**

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Wraps all successful responses in a uniform envelope: { data, meta? }
 * Excludes raw responses (streams, buffers) and responses already wrapped.
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((responseBody) => {
        // Skip wrapping if response is null/undefined (e.g., 204 No Content)
        if (responseBody === undefined || responseBody === null) return responseBody;

        // Skip if already wrapped
        if (responseBody?.data !== undefined && responseBody?.meta !== undefined) {
          return responseBody;
        }

        return { data: responseBody };
      }),
    );
  }
}
```

- [ ] **Step 10: Create common/health/health.controller.ts**

```typescript
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Liveness probe — lightweight, no dependency checks */
  @Get()
  liveness() {
    return { status: 'ok', version: process.env.npm_package_version || '0.0.1', uptime: Math.floor(process.uptime()) };
  }

  /** Readiness probe — checks db + redis (spec Section 5.3) */
  @Get('ready')
  async readiness() {
    const checks: Record<string, string> = {};

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = 'ok';
    } catch {
      checks.database = 'error';
    }

    try {
      await this.redis.ping();
      checks.redis = 'ok';
    } catch {
      checks.redis = 'error';
    }

    // TODO: Add S3/MinIO check when StorageModule is built (Chunk 5)

    const healthy = Object.values(checks).every((v) => v === 'ok');
    return { status: healthy ? 'ok' : 'degraded', checks };
  }
}
```

- [ ] **Step 11: Register global middleware, interceptors, filters, and health in AppModule + main.ts**

Update `backend/src/app.module.ts` — final version with all components:

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggerModule } from 'nestjs-pino';
import { PrismaModule } from './infrastructure/prisma/prisma.module';
import { RedisModule } from './infrastructure/redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { HealthController } from './common/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.initData',
          'req.body.refreshToken',
        ],
      },
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
```

Update `backend/src/main.ts` — add rate limiting:

```typescript
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import { rateLimit } from 'express-rate-limit';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Logger
  app.useLogger(app.get(Logger));

  // Security
  app.use(helmet());
  app.use(hpp());
  app.use(cookieParser());

  // Global rate limit
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: Number(process.env.RATE_LIMIT_GLOBAL_PER_MIN) || 100,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.ip || 'unknown',
      message: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
    }),
  );

  // Auth-specific stricter rate limit
  app.use(
    '/api/v1/auth',
    rateLimit({
      windowMs: 60 * 1000,
      max: Number(process.env.RATE_LIMIT_AUTH_PER_MIN) || 10,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => req.ip || 'unknown',
      message: { status: 429, code: 'RATE_LIMIT_EXCEEDED', message: 'Too many auth requests' },
    }),
  );

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  // Global prefix (exclude health endpoints for Docker/K8s probes)
  app.setGlobalPrefix('api/v1', { exclude: ['health', 'health/ready'] });

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
```

- [ ] **Step 12: Commit**

```bash
git add backend/src/common/ backend/src/app.module.ts backend/src/main.ts
git commit -m "feat: add common guards, decorators, filters, pipes, interceptors, health endpoint, rate limiting"
```

---

## Chunk 3: Feature Modules (Tickets, Messages, Customers, Services, Team, Macros)

> Due to plan size, Chunk 3 will be a separate plan document covering all CRUD feature modules. Each module follows the same pattern: repository → service → controller → dto → tests.

**This plan covers the foundational infrastructure. Chunk 3 (feature modules), Chunk 4 (WebSocket gateway), and Chunk 5 (file storage + reports) will be separate plan files.**

---

## Execution Order Summary

| Task | What | Depends On |
|------|------|------------|
| 1 | Monorepo scaffold | — |
| 2 | Move frontend to workspace | Task 1 |
| 3 | @crm/shared package | Task 1 |
| 4 | NestJS backend scaffold | Task 1, 3 |
| 5 | Prisma schema + migrations | Task 4 |
| 6 | PrismaModule | Task 5 |
| 7 | RedisModule | Task 4 |
| 8 | Docker Compose | Task 1 |
| 9 | Seed data | Task 5, 6 |
| 10 | TelegramVerifyService (TDD) | Task 4 |
| 11 | Auth module (controller, JWT, sessions) | Task 6, 7, 10 |
| 12 | Common guards/decorators/filters | Task 11 |

**Parallelizable:** Tasks 3+8 can run in parallel. Tasks 6+7 can run in parallel. Task 10 can run in parallel with 8+9.
