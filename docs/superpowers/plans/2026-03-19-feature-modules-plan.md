# Feature Modules (Chunk 3) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all CRUD feature modules for the CRM backend — Users, Workspaces, Services, Tickets (with state machine + ticket creation), Messages (cursor-paginated), Customers, Team, Macros, Custom Fields, Audit Logs.

**Out of scope (Chunk 5):** Attachments (pre-signed URLs), Presence (Redis), Reports (KPI aggregates, CSV export). These depend on MinIO/BullMQ infrastructure not yet built.

**Architecture:** Each module follows repository → service → controller pattern. Repositories enforce `workspaceId` scoping and soft-delete filtering. Controllers use existing `JwtAuthGuard`, `WorkspaceScopeGuard`, `RolesGuard` guard chain. Zod schemas from `@crm/shared` validate input.

**Tech Stack:** NestJS 10, Prisma 5, Zod 3, Jest 29, `@crm/shared` types/validators

---

## Conventions (all tasks follow these)

**Guard stack for workspace-scoped endpoints:**
```typescript
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
```

**Controller param types:**
- `@Param('wid') wid: string` — workspace ID from URL
- `@CurrentUser() user: CurrentUserData` — JWT-decoded user
- `@Body(new ZodValidationPipe(schema)) dto: z.infer<typeof schema>` — validated body

**Repository pattern (each module):**
```typescript
@Injectable()
export class XxxRepository {
  constructor(private readonly prisma: PrismaService) {}
  // All queries include workspaceId, exclude isDeleted where applicable
}
```

**Service pattern:**
```typescript
@Injectable()
export class XxxService {
  constructor(private readonly repo: XxxRepository) {}
  // Business logic, access control checks
}
```

**Module registration:** Each module is self-contained, exported via its `.module.ts`, imported in `AppModule`.

**Test pattern:** Unit tests mock PrismaService. Test files live alongside source: `xxx.service.spec.ts`.

**Optimistic locking convention:** All PATCH endpoints with versioned models require `If-Match` header. Parse version via helper:
```typescript
function parseVersion(ifMatch?: string): number | undefined {
  if (!ifMatch) return undefined;
  return parseInt(ifMatch.replace(/"/g, ''), 10);
}
```
If `If-Match` is absent, skip optimistic locking (don't filter by version). If present but stale, throw `409 CONFLICT`.

**Commit after each task.**

---

## Chunk 1: Simple CRUD Modules

### Task 1: Users Module

**Files:**
- Create: `backend/src/users/users.module.ts`
- Create: `backend/src/users/repository/users.repository.ts`
- Create: `backend/src/users/service/users.service.ts`
- Create: `backend/src/users/controller/users.controller.ts`
- Create: `backend/src/users/dto/update-user.dto.ts`
- Create: `backend/src/users/service/users.service.spec.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create DTO**

```typescript
// backend/src/users/dto/update-user.dto.ts
import { z } from 'zod';

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(200).optional(),
  lastName: z.string().max(200).nullable().optional(),
  languageCode: z.string().max(10).optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
```

- [ ] **Step 2: Create repository**

```typescript
// backend/src/users/repository/users.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        memberships: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            role: true,
            status: true,
            workspaceId: true,
            joinedAt: true,
            workspace: { select: { name: true } },
          },
        },
      },
    });
  }

  async update(id: string, data: { firstName?: string; lastName?: string | null; languageCode?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }
}
```

- [ ] **Step 3: Create service**

```typescript
// backend/src/users/service/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../repository/users.repository';
import { UpdateUserDto } from '../dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async getMe(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      languageCode: user.languageCode,
      photoUrl: user.photoUrl,
      createdAt: user.createdAt.toISOString(),
      memberships: user.memberships.map((m) => ({
        id: m.id,
        role: m.role,
        status: m.status,
        workspaceId: m.workspaceId,
        workspaceName: m.workspace.name,
        joinedAt: m.joinedAt?.toISOString() ?? null,
      })),
    };
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    await this.repo.update(userId, dto);
    return this.getMe(userId);
  }
}
```

- [ ] **Step 4: Write failing test**

```typescript
// backend/src/users/service/users.service.spec.ts
import { Test } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UsersRepository } from '../repository/users.repository';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<UsersRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UsersRepository,
          useValue: { findById: jest.fn(), update: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(UsersService);
    repo = module.get(UsersRepository);
  });

  it('getMe returns formatted user with memberships', async () => {
    repo.findById.mockResolvedValue({
      id: 'u1', telegramId: BigInt(123), username: 'alice',
      firstName: 'Alice', lastName: null, languageCode: 'en',
      photoUrl: null, isBot: false,
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
      memberships: [{
        id: 'm1', role: 'ADMIN', status: 'ACTIVE',
        workspaceId: 'w1', joinedAt: new Date('2026-01-01'),
        workspace: { name: 'TestWS' },
      }],
    } as any);

    const result = await service.getMe('u1');
    expect(result.telegramId).toBe('123');
    expect(result.memberships).toHaveLength(1);
    expect(result.memberships[0].workspaceName).toBe('TestWS');
  });

  it('getMe throws NotFoundException for missing user', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getMe('bad')).rejects.toThrow(NotFoundException);
  });

  it('updateMe calls repo.update then returns refreshed user', async () => {
    const mockUser = {
      id: 'u1', telegramId: BigInt(123), username: 'alice',
      firstName: 'Updated', lastName: null, languageCode: 'en',
      photoUrl: null, isBot: false,
      createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
      memberships: [],
    } as any;
    repo.update.mockResolvedValue(mockUser);
    repo.findById.mockResolvedValue(mockUser);

    const result = await service.updateMe('u1', { firstName: 'Updated' });
    expect(repo.update).toHaveBeenCalledWith('u1', { firstName: 'Updated' });
    expect(result.firstName).toBe('Updated');
  });
});
```

- [ ] **Step 5: Run test, verify pass**

Run: `cd backend && npx jest users.service.spec --no-coverage`
Expected: 3 tests PASS

- [ ] **Step 6: Create controller**

```typescript
// backend/src/users/controller/users.controller.ts
import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { UsersService } from '../service/users.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { updateUserSchema } from '../dto/update-user.dto';

@Controller('me')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  getMe(@CurrentUser() user: CurrentUserData) {
    return this.users.getMe(user.userId);
  }

  @Patch()
  updateMe(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(updateUserSchema)) dto: any,
  ) {
    return this.users.updateMe(user.userId, dto);
  }
}
```

- [ ] **Step 7: Create module and register in AppModule**

```typescript
// backend/src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersController } from './controller/users.controller';
import { UsersService } from './service/users.service';
import { UsersRepository } from './repository/users.repository';

@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
```

Add to `backend/src/app.module.ts` imports array:
```typescript
import { UsersModule } from './users/users.module';
// add UsersModule to imports: [...]
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/users/ backend/src/app.module.ts
git commit -m "feat: add users module with GET/PATCH /me endpoints"
```

---

### Task 2: Workspaces Module

**Files:**
- Create: `backend/src/workspaces/workspaces.module.ts`
- Create: `backend/src/workspaces/repository/workspaces.repository.ts`
- Create: `backend/src/workspaces/service/workspaces.service.ts`
- Create: `backend/src/workspaces/controller/workspaces.controller.ts`
- Create: `backend/src/workspaces/dto/create-workspace.dto.ts`
- Create: `backend/src/workspaces/dto/update-workspace.dto.ts`
- Create: `backend/src/workspaces/service/workspaces.service.spec.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create DTOs**

```typescript
// backend/src/workspaces/dto/create-workspace.dto.ts
import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  botUsername: z.string().max(200).optional(),
});

export type CreateWorkspaceDto = z.infer<typeof createWorkspaceSchema>;
```

```typescript
// backend/src/workspaces/dto/update-workspace.dto.ts
import { z } from 'zod';

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  botUsername: z.string().max(200).nullable().optional(),
  brandConfig: z.record(z.unknown()).optional(),
  slaDefaults: z.record(z.number().int().min(1)).optional(),
});

export type UpdateWorkspaceDto = z.infer<typeof updateWorkspaceSchema>;
```

- [ ] **Step 2: Create repository**

```typescript
// backend/src/workspaces/repository/workspaces.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';

@Injectable()
export class WorkspacesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.workspace.findFirst({
      where: { id, isDeleted: false },
    });
  }

  async findMembership(userId: string, workspaceId: string) {
    return this.prisma.membership.findFirst({
      where: { userId, workspaceId, status: 'ACTIVE' },
    });
  }

  async create(data: CreateWorkspaceDto, ownerId: string) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({ data });

      // Create owner membership
      await tx.membership.create({
        data: {
          userId: ownerId,
          workspaceId: workspace.id,
          role: 'WORKSPACE_OWNER',
          status: 'ACTIVE',
          joinedAt: new Date(),
        },
      });

      // Initialize counters
      await tx.workspaceCounter.createMany({
        data: [
          { workspaceId: workspace.id, counterType: 'client', lastValue: 0 },
          { workspaceId: workspace.id, counterType: 'ticket', lastValue: 0 },
        ],
      });

      return workspace;
    });
  }

  async update(id: string, data: UpdateWorkspaceDto) {
    return this.prisma.workspace.update({ where: { id }, data });
  }
}
```

- [ ] **Step 3: Create service**

```typescript
// backend/src/workspaces/service/workspaces.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { WorkspacesRepository } from '../repository/workspaces.repository';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly repo: WorkspacesRepository) {}

  async create(dto: CreateWorkspaceDto, userId: string) {
    const workspace = await this.repo.create(dto, userId);
    return this.formatResponse(workspace);
  }

  async getById(workspaceId: string, userId: string) {
    const ws = await this.repo.findById(workspaceId);
    if (!ws) throw new NotFoundException('WORKSPACE_NOT_FOUND');

    // Verify user is a member of this workspace
    const membership = await this.repo.findMembership(userId, workspaceId);
    if (!membership) throw new ForbiddenException('FORBIDDEN');

    return this.formatResponse(ws);
  }

  async update(workspaceId: string, dto: UpdateWorkspaceDto) {
    const ws = await this.repo.findById(workspaceId);
    if (!ws) throw new NotFoundException('WORKSPACE_NOT_FOUND');
    const updated = await this.repo.update(workspaceId, dto);
    return this.formatResponse(updated);
  }

  private formatResponse(ws: any) {
    return {
      id: ws.id,
      name: ws.name,
      slug: ws.slug,
      botUsername: ws.botUsername,
      brandConfig: ws.brandConfig,
      slaDefaults: ws.slaDefaults,
      createdAt: ws.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 4: Write failing test**

```typescript
// backend/src/workspaces/service/workspaces.service.spec.ts
import { Test } from '@nestjs/testing';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesRepository } from '../repository/workspaces.repository';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let repo: jest.Mocked<WorkspacesRepository>;

  const mockWs = {
    id: 'w1', name: 'Test', slug: 'test', botUsername: null,
    brandConfig: {}, slaDefaults: {}, isDeleted: false, deletedAt: null,
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  } as any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: WorkspacesRepository,
          useValue: { findById: jest.fn(), findMembership: jest.fn(), create: jest.fn(), update: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(WorkspacesService);
    repo = module.get(WorkspacesRepository);
  });

  it('create returns formatted workspace', async () => {
    repo.create.mockResolvedValue(mockWs);
    const result = await service.create({ name: 'Test', slug: 'test' }, 'u1');
    expect(result.id).toBe('w1');
    expect(repo.create).toHaveBeenCalledWith({ name: 'Test', slug: 'test' }, 'u1');
  });

  it('getById throws NotFoundException when missing', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('bad', 'u1')).rejects.toThrow(NotFoundException);
  });

  it('getById throws ForbiddenException for non-member', async () => {
    repo.findById.mockResolvedValue(mockWs);
    repo.findMembership.mockResolvedValue(null);
    await expect(service.getById('w1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('update returns updated workspace', async () => {
    repo.findById.mockResolvedValue(mockWs);
    repo.update.mockResolvedValue({ ...mockWs, name: 'Updated' });
    const result = await service.update('w1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });
});
```

- [ ] **Step 5: Run test, verify pass**

Run: `cd backend && npx jest workspaces.service.spec --no-coverage`
Expected: 3 tests PASS

- [ ] **Step 6: Create controller**

```typescript
// backend/src/workspaces/controller/workspaces.controller.ts
import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { WorkspacesService } from '../service/workspaces.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createWorkspaceSchema } from '../dto/create-workspace.dto';
import { updateWorkspaceSchema } from '../dto/update-workspace.dto';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}


  @Post()
  create(
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(createWorkspaceSchema)) dto: any,
  ) {
    return this.workspaces.create(dto, user.userId);
  }

  @Get(':wid')
  @UseGuards(WorkspaceScopeGuard)
  getById(@Param('wid') wid: string, @CurrentUser() user: CurrentUserData) {
    return this.workspaces.getById(wid, user.userId);
  }

  @Patch(':wid')
  @UseGuards(WorkspaceScopeGuard, RolesGuard)
  @Roles('WORKSPACE_OWNER', 'ADMIN')
  update(
    @Param('wid') wid: string,
    @Body(new ZodValidationPipe(updateWorkspaceSchema)) dto: any,
  ) {
    return this.workspaces.update(wid, dto);
  }
}
```

- [ ] **Step 7: Create module and register in AppModule**

```typescript
// backend/src/workspaces/workspaces.module.ts
import { Module } from '@nestjs/common';
import { WorkspacesController } from './controller/workspaces.controller';
import { WorkspacesService } from './service/workspaces.service';
import { WorkspacesRepository } from './repository/workspaces.repository';

@Module({
  controllers: [WorkspacesController],
  providers: [WorkspacesService, WorkspacesRepository],
  exports: [WorkspacesService, WorkspacesRepository],
})
export class WorkspacesModule {}
```

Add `WorkspacesModule` to `app.module.ts` imports.

- [ ] **Step 8: Commit**

```bash
git add backend/src/workspaces/ backend/src/app.module.ts
git commit -m "feat: add workspaces module with CRUD endpoints"
```

---

### Task 3: Services Module

**Files:**
- Create: `backend/src/services/services.module.ts`
- Create: `backend/src/services/repository/services.repository.ts`
- Create: `backend/src/services/service/services.service.ts`
- Create: `backend/src/services/controller/services.controller.ts`
- Create: `backend/src/services/service/services.service.spec.ts`
- Modify: `backend/src/app.module.ts`

Spec endpoints:
- `GET /workspaces/:wid/services` — list (members)
- `POST /workspaces/:wid/services` — create with auto-generated startParam + deep links (OWNER/ADMIN)
- `PATCH /workspaces/:wid/services/:sid` — update (OWNER/ADMIN)
- `DELETE /workspaces/:wid/services/:sid` — soft-deactivate (OWNER)

- [ ] **Step 1: Create repository**

```typescript
// backend/src/services/repository/services.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { createId } from '@paralleldrive/cuid2';

@Injectable()
export class ServicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByWorkspace(workspaceId: string, includeInactive = false) {
    const where: any = { workspaceId };
    if (!includeInactive) where.isActive = true;
    return this.prisma.service.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.service.findFirst({
      where: { id, workspaceId },
    });
  }

  async create(workspaceId: string, data: { name: string; description?: string; slaMinutes?: number; routingMode?: string }) {
    const startParam = createId(); // unique deep-link key
    return this.prisma.service.create({
      data: { ...data, workspaceId, startParam },
    });
  }

  async update(id: string, data: { name?: string; description?: string | null; slaMinutes?: number; routingMode?: string }, version?: number) {
    const where: any = { id };
    if (version !== undefined) where.version = version;
    return this.prisma.service.update({
      where,
      data: { ...data, version: { increment: 1 } },
    });
  }

  async deactivate(id: string) {
    return this.prisma.service.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
```

- [ ] **Step 2: Create service**

```typescript
// backend/src/services/service/services.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ServicesRepository } from '../repository/services.repository';

@Injectable()
export class ServicesService {
  constructor(private readonly repo: ServicesRepository) {}

  async list(workspaceId: string, includeInactive = false) {
    const services = await this.repo.findAllByWorkspace(workspaceId, includeInactive);
    return services.map((s) => this.formatResponse(s));
  }

  async create(workspaceId: string, dto: { name: string; description?: string; slaMinutes?: number; routingMode?: string }) {
    const service = await this.repo.create(workspaceId, dto);
    return this.formatResponse(service);
  }

  async update(workspaceId: string, serviceId: string, dto: any, version?: number) {
    const existing = await this.repo.findById(serviceId, workspaceId);
    if (!existing) throw new NotFoundException('SERVICE_NOT_FOUND');

    try {
      const updated = await this.repo.update(serviceId, dto, version);
      return this.formatResponse(updated);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new ConflictException('CONFLICT');
      }
      throw e;
    }
  }

  async deactivate(workspaceId: string, serviceId: string) {
    const existing = await this.repo.findById(serviceId, workspaceId);
    if (!existing) throw new NotFoundException('SERVICE_NOT_FOUND');
    await this.repo.deactivate(serviceId);
  }

  private formatResponse(s: any) {
    return {
      id: s.id,
      name: s.name,
      description: s.description,
      startParam: s.startParam,
      slaMinutes: s.slaMinutes,
      isActive: s.isActive,
      routingMode: s.routingMode,
      version: s.version,
      createdAt: s.createdAt.toISOString(),
    };
  }
}
```

- [ ] **Step 3: Write test**

```typescript
// backend/src/services/service/services.service.spec.ts
import { Test } from '@nestjs/testing';
import { ServicesService } from './services.service';
import { ServicesRepository } from '../repository/services.repository';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('ServicesService', () => {
  let service: ServicesService;
  let repo: jest.Mocked<ServicesRepository>;

  const mockSvc = {
    id: 's1', name: 'Support', description: null, startParam: 'abc123',
    slaMinutes: 30, isActive: true, routingMode: 'manual', version: 1,
    workspaceId: 'w1', createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  } as any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ServicesService,
        {
          provide: ServicesRepository,
          useValue: {
            findAllByWorkspace: jest.fn(), findById: jest.fn(),
            create: jest.fn(), update: jest.fn(), deactivate: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(ServicesService);
    repo = module.get(ServicesRepository);
  });

  it('list returns formatted services', async () => {
    repo.findAllByWorkspace.mockResolvedValue([mockSvc]);
    const result = await service.list('w1');
    expect(result).toHaveLength(1);
    expect(result[0].startParam).toBe('abc123');
  });

  it('create returns new service', async () => {
    repo.create.mockResolvedValue(mockSvc);
    const result = await service.create('w1', { name: 'Support' });
    expect(result.name).toBe('Support');
  });

  it('update throws NotFoundException for missing service', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.update('w1', 'bad', {}, 1)).rejects.toThrow(NotFoundException);
  });

  it('deactivate calls repo.deactivate', async () => {
    repo.findById.mockResolvedValue(mockSvc);
    await service.deactivate('w1', 's1');
    expect(repo.deactivate).toHaveBeenCalledWith('s1');
  });
});
```

- [ ] **Step 4: Run test, verify pass**

Run: `cd backend && npx jest services.service.spec --no-coverage`
Expected: 4 tests PASS

- [ ] **Step 5: Create controller**

```typescript
// backend/src/services/controller/services.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Headers, UseGuards, HttpCode } from '@nestjs/common';
import { ServicesService } from '../service/services.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createServiceSchema } from '@crm/shared';
import { z } from 'zod';

const updateServiceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  slaMinutes: z.number().int().min(1).max(10080).optional(),
  routingMode: z.enum(['manual', 'round_robin']).optional(),
});

@Controller('workspaces/:wid/services')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard)
export class ServicesController {
  constructor(private readonly services: ServicesService) {}

  @Get()
  list(@Param('wid') wid: string, @Query('includeInactive') includeInactive?: string) {
    return this.services.list(wid, includeInactive === 'true');
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('WORKSPACE_OWNER', 'ADMIN')
  create(
    @Param('wid') wid: string,
    @Body(new ZodValidationPipe(createServiceSchema)) dto: any,
  ) {
    return this.services.create(wid, dto);
  }

  @Patch(':sid')
  @UseGuards(RolesGuard)
  @Roles('WORKSPACE_OWNER', 'ADMIN')
  update(
    @Param('wid') wid: string,
    @Param('sid') sid: string,
    @Body(new ZodValidationPipe(updateServiceSchema)) dto: any,
    @Headers('if-match') ifMatch?: string,
  ) {
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, ''), 10) : undefined;
    return this.services.update(wid, sid, dto, version);
  }

  @Delete(':sid')
  @UseGuards(RolesGuard)
  @Roles('WORKSPACE_OWNER')
  @HttpCode(204)
  async deactivate(@Param('wid') wid: string, @Param('sid') sid: string) {
    await this.services.deactivate(wid, sid);
  }
}
```

- [ ] **Step 6: Create module and register**

```typescript
// backend/src/services/services.module.ts
import { Module } from '@nestjs/common';
import { ServicesController } from './controller/services.controller';
import { ServicesService } from './service/services.service';
import { ServicesRepository } from './repository/services.repository';

@Module({
  controllers: [ServicesController],
  providers: [ServicesService, ServicesRepository],
  exports: [ServicesService, ServicesRepository],
})
export class ServicesModule {}
```

Add `ServicesModule` to `app.module.ts` imports.

- [ ] **Step 7: Commit**

```bash
git add backend/src/services/ backend/src/app.module.ts
git commit -m "feat: add services module with CRUD + deep-link generation"
```

---

### Task 4: Team Module

**Files:**
- Create: `backend/src/team/team.module.ts`
- Create: `backend/src/team/repository/team.repository.ts`
- Create: `backend/src/team/service/team.service.ts`
- Create: `backend/src/team/controller/team.controller.ts`
- Create: `backend/src/team/service/team.service.spec.ts`
- Modify: `backend/src/app.module.ts`

Spec endpoints:
- `GET /workspaces/:wid/team` — list (ADMIN/OWNER)
- `POST /workspaces/:wid/team/invite` — invite by telegramId (OWNER/ADMIN)
- `PATCH /workspaces/:wid/team/:mid` — update role/status (OWNER)
- `DELETE /workspaces/:wid/team/:mid` — remove (OWNER, cannot remove self/last owner)

- [ ] **Step 1: Create repository**

```typescript
// backend/src/team/repository/team.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class TeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string) {
    return this.prisma.membership.findMany({
      where: { workspaceId, role: { not: 'CUSTOMER' } },
      include: { user: { select: { id: true, firstName: true, lastName: true, username: true, photoUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.membership.findFirst({
      where: { id, workspaceId, role: { not: 'CUSTOMER' } },
      include: { user: true },
    });
  }

  async findByTelegramId(telegramId: bigint, workspaceId: string) {
    return this.prisma.membership.findFirst({
      where: { user: { telegramId }, workspaceId },
    });
  }

  async countOwners(workspaceId: string) {
    return this.prisma.membership.count({
      where: { workspaceId, role: 'WORKSPACE_OWNER', status: 'ACTIVE' },
    });
  }

  async invite(workspaceId: string, telegramId: string, role: 'ADMIN' | 'AGENT') {
    return this.prisma.$transaction(async (tx) => {
      // Upsert user by telegramId (might not exist yet)
      const user = await tx.user.upsert({
        where: { telegramId: BigInt(telegramId) },
        create: { telegramId: BigInt(telegramId), firstName: 'Invited' },
        update: {},
      });

      return tx.membership.create({
        data: { userId: user.id, workspaceId, role, status: 'INVITED' },
        include: { user: { select: { id: true, firstName: true, lastName: true, username: true, photoUrl: true } } },
      });
    });
  }

  async updateRole(id: string, data: { role?: string; status?: string }) {
    return this.prisma.membership.update({
      where: { id },
      data,
      include: { user: { select: { id: true, firstName: true, lastName: true, username: true, photoUrl: true } } },
    });
  }

  async remove(id: string) {
    return this.prisma.membership.update({
      where: { id },
      data: { status: 'DEACTIVATED' },
    });
  }
}
```

- [ ] **Step 2: Create service**

```typescript
// backend/src/team/service/team.service.ts
import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { TeamRepository } from '../repository/team.repository';

@Injectable()
export class TeamService {
  constructor(private readonly repo: TeamRepository) {}

  async list(workspaceId: string) {
    const members = await this.repo.findByWorkspace(workspaceId);
    return members.map((m) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      userId: m.user.id,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      username: m.user.username,
      photoUrl: m.user.photoUrl,
      joinedAt: m.joinedAt?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString(),
    }));
  }

  async invite(workspaceId: string, telegramId: string, role: 'ADMIN' | 'AGENT') {
    const existing = await this.repo.findByTelegramId(BigInt(telegramId), workspaceId);
    if (existing) throw new ConflictException('CONFLICT');

    const membership = await this.repo.invite(workspaceId, telegramId, role);
    return {
      id: membership.id,
      role: membership.role,
      status: membership.status,
      userId: membership.user.id,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      username: membership.user.username,
      joinedAt: null,
      createdAt: membership.createdAt.toISOString(),
    };
  }

  async updateMember(workspaceId: string, membershipId: string, data: { role?: string; status?: string }) {
    const member = await this.repo.findById(membershipId, workspaceId);
    if (!member) throw new NotFoundException('USER_NOT_FOUND');
    const updated = await this.repo.updateRole(membershipId, data);
    return {
      id: updated.id,
      role: updated.role,
      status: updated.status,
      userId: updated.user.id,
      firstName: updated.user.firstName,
    };
  }

  async remove(workspaceId: string, membershipId: string, actorUserId: string) {
    const member = await this.repo.findById(membershipId, workspaceId);
    if (!member) throw new NotFoundException('USER_NOT_FOUND');

    // Cannot remove self
    if (member.userId === actorUserId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    // Cannot remove last owner
    if (member.role === 'WORKSPACE_OWNER') {
      const ownerCount = await this.repo.countOwners(workspaceId);
      if (ownerCount <= 1) throw new ForbiddenException('FORBIDDEN');
    }

    await this.repo.remove(membershipId);
  }
}
```

- [ ] **Step 3: Write test**

```typescript
// backend/src/team/service/team.service.spec.ts
import { Test } from '@nestjs/testing';
import { TeamService } from './team.service';
import { TeamRepository } from '../repository/team.repository';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';

describe('TeamService', () => {
  let service: TeamService;
  let repo: jest.Mocked<TeamRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: TeamRepository,
          useValue: {
            findByWorkspace: jest.fn(), findById: jest.fn(),
            findByTelegramId: jest.fn(), countOwners: jest.fn(),
            invite: jest.fn(), updateRole: jest.fn(), remove: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(TeamService);
    repo = module.get(TeamRepository);
  });

  it('remove throws ForbiddenException when removing self', async () => {
    repo.findById.mockResolvedValue({ userId: 'u1', role: 'ADMIN' } as any);
    await expect(service.remove('w1', 'm1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('remove throws ForbiddenException when removing last owner', async () => {
    repo.findById.mockResolvedValue({ userId: 'u2', role: 'WORKSPACE_OWNER' } as any);
    repo.countOwners.mockResolvedValue(1);
    await expect(service.remove('w1', 'm1', 'u1')).rejects.toThrow(ForbiddenException);
  });

  it('invite throws ConflictException for existing member', async () => {
    repo.findByTelegramId.mockResolvedValue({ id: 'existing' } as any);
    await expect(service.invite('w1', '123', 'AGENT')).rejects.toThrow(ConflictException);
  });
});
```

- [ ] **Step 4: Run test, verify pass**

Run: `cd backend && npx jest team.service.spec --no-coverage`
Expected: 3 tests PASS

- [ ] **Step 5: Create controller**

```typescript
// backend/src/team/controller/team.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { TeamService } from '../service/team.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { inviteTeamMemberSchema } from '@crm/shared';
import { z } from 'zod';

const updateTeamMemberSchema = z.object({
  role: z.enum(['WORKSPACE_OWNER', 'ADMIN', 'AGENT']).optional(),
  status: z.enum(['ACTIVE', 'DEACTIVATED']).optional(),
});

@Controller('workspaces/:wid/team')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get()
  @Roles('WORKSPACE_OWNER', 'ADMIN')
  list(@Param('wid') wid: string) {
    return this.team.list(wid);
  }

  @Post('invite')
  @Roles('WORKSPACE_OWNER', 'ADMIN')
  invite(
    @Param('wid') wid: string,
    @Body(new ZodValidationPipe(inviteTeamMemberSchema)) dto: any,
  ) {
    return this.team.invite(wid, dto.telegramId, dto.role);
  }

  @Patch(':mid')
  @Roles('WORKSPACE_OWNER')
  updateMember(
    @Param('wid') wid: string,
    @Param('mid') mid: string,
    @Body(new ZodValidationPipe(updateTeamMemberSchema)) dto: any,
  ) {
    return this.team.updateMember(wid, mid, dto);
  }

  @Delete(':mid')
  @Roles('WORKSPACE_OWNER')
  @HttpCode(204)
  async remove(
    @Param('wid') wid: string,
    @Param('mid') mid: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.team.remove(wid, mid, user.userId);
  }
}
```

- [ ] **Step 6: Create module and register**

```typescript
// backend/src/team/team.module.ts
import { Module } from '@nestjs/common';
import { TeamController } from './controller/team.controller';
import { TeamService } from './service/team.service';
import { TeamRepository } from './repository/team.repository';

@Module({
  controllers: [TeamController],
  providers: [TeamService, TeamRepository],
  exports: [TeamService],
})
export class TeamModule {}
```

Add `TeamModule` to `app.module.ts` imports.

- [ ] **Step 7: Commit**

```bash
git add backend/src/team/ backend/src/app.module.ts
git commit -m "feat: add team module with invite, role management, ownership protection"
```

---

### Task 5: Macros Module

**Files:**
- Create: `backend/src/macros/macros.module.ts`
- Create: `backend/src/macros/repository/macros.repository.ts`
- Create: `backend/src/macros/service/macros.service.ts`
- Create: `backend/src/macros/controller/macros.controller.ts`
- Create: `backend/src/macros/service/macros.service.spec.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create repository**

```typescript
// backend/src/macros/repository/macros.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class MacrosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string) {
    return this.prisma.macro.findMany({
      where: { workspaceId },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.macro.findFirst({ where: { id, workspaceId } });
  }

  async create(workspaceId: string, data: { name: string; content: string; category?: string; sortOrder?: number }) {
    return this.prisma.macro.create({ data: { ...data, workspaceId } });
  }

  async update(id: string, data: { name?: string; content?: string; category?: string; sortOrder?: number }, version?: number) {
    const where: any = { id };
    if (version !== undefined) where.version = version;
    return this.prisma.macro.update({
      where,
      data: { ...data, version: { increment: 1 } },
    });
  }

  async remove(id: string) {
    return this.prisma.macro.delete({ where: { id } });
  }
}
```

- [ ] **Step 2: Create service**

```typescript
// backend/src/macros/service/macros.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MacrosRepository } from '../repository/macros.repository';

@Injectable()
export class MacrosService {
  constructor(private readonly repo: MacrosRepository) {}

  async list(workspaceId: string) {
    const macros = await this.repo.findByWorkspace(workspaceId);
    return macros.map((m) => ({
      id: m.id, name: m.name, content: m.content,
      category: m.category, sortOrder: m.sortOrder,
      version: m.version, createdAt: m.createdAt.toISOString(),
    }));
  }

  async create(workspaceId: string, dto: { name: string; content: string; category?: string; sortOrder?: number }) {
    const macro = await this.repo.create(workspaceId, dto);
    return { id: macro.id, name: macro.name, content: macro.content, category: macro.category, sortOrder: macro.sortOrder, version: macro.version, createdAt: macro.createdAt.toISOString() };
  }

  async update(workspaceId: string, macroId: string, dto: any, version?: number) {
    const existing = await this.repo.findById(macroId, workspaceId);
    if (!existing) throw new NotFoundException('NOT_FOUND');
    try {
      const updated = await this.repo.update(macroId, dto, version);
      return { id: updated.id, name: updated.name, content: updated.content, category: updated.category, sortOrder: updated.sortOrder, version: updated.version };
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new ConflictException('CONFLICT');
      }
      throw e;
    }
  }

  async remove(workspaceId: string, macroId: string) {
    const existing = await this.repo.findById(macroId, workspaceId);
    if (!existing) throw new NotFoundException('NOT_FOUND');
    await this.repo.remove(macroId);
  }
}
```

- [ ] **Step 3: Write test**

```typescript
// backend/src/macros/service/macros.service.spec.ts
import { Test } from '@nestjs/testing';
import { MacrosService } from './macros.service';
import { MacrosRepository } from '../repository/macros.repository';
import { NotFoundException } from '@nestjs/common';

describe('MacrosService', () => {
  let service: MacrosService;
  let repo: jest.Mocked<MacrosRepository>;

  const mockMacro = {
    id: 'm1', name: 'Greeting', content: 'Hello!', category: 'general',
    sortOrder: 0, version: 1, workspaceId: 'w1',
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  } as any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MacrosService,
        {
          provide: MacrosRepository,
          useValue: {
            findByWorkspace: jest.fn(), findById: jest.fn(),
            create: jest.fn(), update: jest.fn(), remove: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(MacrosService);
    repo = module.get(MacrosRepository);
  });

  it('list returns formatted macros', async () => {
    repo.findByWorkspace.mockResolvedValue([mockMacro]);
    const result = await service.list('w1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Greeting');
  });

  it('remove throws NotFoundException for missing macro', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.remove('w1', 'bad')).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 4: Run test, verify pass**

Run: `cd backend && npx jest macros.service.spec --no-coverage`
Expected: 2 tests PASS

- [ ] **Step 5: Create controller**

```typescript
// backend/src/macros/controller/macros.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, Headers, UseGuards, HttpCode } from '@nestjs/common';
import { MacrosService } from '../service/macros.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createMacroSchema } from '@crm/shared';
import { z } from 'zod';

const updateMacroSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  category: z.string().max(100).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

@Controller('workspaces/:wid/macros')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
export class MacrosController {
  constructor(private readonly macros: MacrosService) {}

  @Get()
  @Roles('WORKSPACE_OWNER', 'ADMIN', 'AGENT')
  list(@Param('wid') wid: string) {
    return this.macros.list(wid);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Param('wid') wid: string,
    @Body(new ZodValidationPipe(createMacroSchema)) dto: any,
  ) {
    return this.macros.create(wid, dto);
  }

  @Patch(':mid')
  @Roles('ADMIN')
  update(
    @Param('wid') wid: string,
    @Param('mid') mid: string,
    @Body(new ZodValidationPipe(updateMacroSchema)) dto: any,
    @Headers('if-match') ifMatch?: string,
  ) {
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, ''), 10) : undefined;
    return this.macros.update(wid, mid, dto, version);
  }

  @Delete(':mid')
  @Roles('ADMIN')
  @HttpCode(204)
  async remove(@Param('wid') wid: string, @Param('mid') mid: string) {
    await this.macros.remove(wid, mid);
  }
}
```

- [ ] **Step 6: Create module and register**

```typescript
// backend/src/macros/macros.module.ts
import { Module } from '@nestjs/common';
import { MacrosController } from './controller/macros.controller';
import { MacrosService } from './service/macros.service';
import { MacrosRepository } from './repository/macros.repository';

@Module({
  controllers: [MacrosController],
  providers: [MacrosService, MacrosRepository],
  exports: [MacrosService],
})
export class MacrosModule {}
```

Add `MacrosModule` to `app.module.ts` imports.

- [ ] **Step 7: Commit**

```bash
git add backend/src/macros/ backend/src/app.module.ts
git commit -m "feat: add macros module with CRUD and optimistic locking"
```

---

### Task 6: Custom Fields Module

**Files:**
- Create: `backend/src/custom-fields/custom-fields.module.ts`
- Create: `backend/src/custom-fields/repository/custom-fields.repository.ts`
- Create: `backend/src/custom-fields/service/custom-fields.service.ts`
- Create: `backend/src/custom-fields/controller/custom-fields.controller.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create DTO**

```typescript
// backend/src/custom-fields/dto/custom-field.dto.ts
import { z } from 'zod';

export const createCustomFieldSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z_][a-z0-9_]*$/, 'Must be snake_case identifier'),
  label: z.string().min(1).max(200),
  fieldType: z.enum(['text', 'number', 'date', 'select']),
  options: z.array(z.string()).optional(),
  isRequired: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

export const updateCustomFieldSchema = createCustomFieldSchema.partial().omit({ name: true });
```

- [ ] **Step 2: Create repository**

```typescript
// backend/src/custom-fields/repository/custom-fields.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class CustomFieldsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string) {
    return this.prisma.customFieldDef.findMany({
      where: { workspaceId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.customFieldDef.findFirst({ where: { id, workspaceId } });
  }

  async create(workspaceId: string, data: any) {
    return this.prisma.customFieldDef.create({ data: { ...data, workspaceId } });
  }

  async update(id: string, data: any) {
    return this.prisma.customFieldDef.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.customFieldDef.delete({ where: { id } });
  }
}
```

- [ ] **Step 3: Create service**

```typescript
// backend/src/custom-fields/service/custom-fields.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { CustomFieldsRepository } from '../repository/custom-fields.repository';

@Injectable()
export class CustomFieldsService {
  constructor(private readonly repo: CustomFieldsRepository) {}

  async list(workspaceId: string) {
    const fields = await this.repo.findByWorkspace(workspaceId);
    return fields.map((f) => ({
      id: f.id, name: f.name, label: f.label, fieldType: f.fieldType,
      options: f.options, isRequired: f.isRequired, sortOrder: f.sortOrder,
      createdAt: f.createdAt.toISOString(),
    }));
  }

  async create(workspaceId: string, dto: any) {
    const field = await this.repo.create(workspaceId, dto);
    return { id: field.id, name: field.name, label: field.label, fieldType: field.fieldType, options: field.options, isRequired: field.isRequired, sortOrder: field.sortOrder, createdAt: field.createdAt.toISOString() };
  }

  async update(workspaceId: string, fieldId: string, dto: any) {
    const existing = await this.repo.findById(fieldId, workspaceId);
    if (!existing) throw new NotFoundException('NOT_FOUND');
    const updated = await this.repo.update(fieldId, dto);
    return { id: updated.id, name: updated.name, label: updated.label, fieldType: updated.fieldType, options: updated.options, isRequired: updated.isRequired, sortOrder: updated.sortOrder };
  }

  async remove(workspaceId: string, fieldId: string) {
    const existing = await this.repo.findById(fieldId, workspaceId);
    if (!existing) throw new NotFoundException('NOT_FOUND');
    await this.repo.remove(fieldId);
  }
}
```

- [ ] **Step 4: Write test**

```typescript
// backend/src/custom-fields/service/custom-fields.service.spec.ts
import { Test } from '@nestjs/testing';
import { CustomFieldsService } from './custom-fields.service';
import { CustomFieldsRepository } from '../repository/custom-fields.repository';
import { NotFoundException } from '@nestjs/common';

describe('CustomFieldsService', () => {
  let service: CustomFieldsService;
  let repo: jest.Mocked<CustomFieldsRepository>;

  const mockField = {
    id: 'cf1', name: 'company', label: 'Company', fieldType: 'text',
    options: null, isRequired: false, sortOrder: 0, workspaceId: 'w1',
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
  } as any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CustomFieldsService,
        {
          provide: CustomFieldsRepository,
          useValue: {
            findByWorkspace: jest.fn(), findById: jest.fn(),
            create: jest.fn(), update: jest.fn(), remove: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(CustomFieldsService);
    repo = module.get(CustomFieldsRepository);
  });

  it('list returns formatted fields', async () => {
    repo.findByWorkspace.mockResolvedValue([mockField]);
    const result = await service.list('w1');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('company');
  });

  it('remove throws NotFoundException for missing field', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.remove('w1', 'bad')).rejects.toThrow(NotFoundException);
  });

  it('update throws NotFoundException for missing field', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.update('w1', 'bad', {})).rejects.toThrow(NotFoundException);
  });
});
```

- [ ] **Step 5: Run test, verify pass**

Run: `cd backend && npx jest custom-fields.service.spec --no-coverage`
Expected: 3 tests PASS

- [ ] **Step 6: Create controller**

```typescript
// backend/src/custom-fields/controller/custom-fields.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, HttpCode } from '@nestjs/common';
import { CustomFieldsService } from '../service/custom-fields.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createCustomFieldSchema, updateCustomFieldSchema } from '../dto/custom-field.dto';

@Controller('workspaces/:wid/custom-fields')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
export class CustomFieldsController {
  constructor(private readonly fields: CustomFieldsService) {}

  @Get()
  @Roles('WORKSPACE_OWNER', 'ADMIN', 'AGENT')
  list(@Param('wid') wid: string) {
    return this.fields.list(wid);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Param('wid') wid: string,
    @Body(new ZodValidationPipe(createCustomFieldSchema)) dto: any,
  ) {
    return this.fields.create(wid, dto);
  }

  @Patch(':fid')
  @Roles('ADMIN')
  update(
    @Param('wid') wid: string,
    @Param('fid') fid: string,
    @Body(new ZodValidationPipe(updateCustomFieldSchema)) dto: any,
  ) {
    return this.fields.update(wid, fid, dto);
  }

  @Delete(':fid')
  @Roles('ADMIN')
  @HttpCode(204)
  async remove(@Param('wid') wid: string, @Param('fid') fid: string) {
    await this.fields.remove(wid, fid);
  }
}
```

- [ ] **Step 7: Create module and register**

```typescript
// backend/src/custom-fields/custom-fields.module.ts
import { Module } from '@nestjs/common';
import { CustomFieldsController } from './controller/custom-fields.controller';
import { CustomFieldsService } from './service/custom-fields.service';
import { CustomFieldsRepository } from './repository/custom-fields.repository';

@Module({
  controllers: [CustomFieldsController],
  providers: [CustomFieldsService, CustomFieldsRepository],
  exports: [CustomFieldsService],
})
export class CustomFieldsModule {}
```

Add `CustomFieldsModule` to `app.module.ts` imports.

- [ ] **Step 8: Commit**

```bash
git add backend/src/custom-fields/ backend/src/app.module.ts
git commit -m "feat: add custom-fields module with CRUD endpoints"
```

---

### Task 7: Audit Logs Module

**Files:**
- Create: `backend/src/audit/audit.module.ts`
- Create: `backend/src/audit/repository/audit.repository.ts`
- Create: `backend/src/audit/service/audit.service.ts`
- Create: `backend/src/audit/controller/audit.controller.ts`
- Modify: `backend/src/app.module.ts`

Spec: `GET /workspaces/:wid/audit-logs` — paginated, filterable (OWNER/ADMIN)

- [ ] **Step 1: Create DTO**

```typescript
// backend/src/audit/dto/audit-query.dto.ts
import { z } from 'zod';
import { paginationSchema } from '@crm/shared';

export const auditQuerySchema = paginationSchema.extend({
  action: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  userId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
```

- [ ] **Step 2: Create repository**

```typescript
// backend/src/audit/repository/audit.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class AuditRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string, filters: {
    action?: string; entityType?: string; entityId?: string;
    userId?: string; from?: string; to?: string;
    page: number; limit: number;
  }) {
    const where: any = { workspaceId };
    if (filters.action) where.action = filters.action;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to) where.createdAt.lte = new Date(filters.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: { actor: { select: { id: true, firstName: true, lastName: true, username: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { data, total };
  }

  async create(data: {
    workspaceId: string; userId?: string; action: string;
    entityType: string; entityId: string;
    oldValue?: any; newValue?: any;
    ipAddress?: string; userAgent?: string;
  }) {
    return this.prisma.auditLog.create({ data });
  }
}
```

- [ ] **Step 3: Create service**

```typescript
// backend/src/audit/service/audit.service.ts
import { Injectable } from '@nestjs/common';
import { AuditRepository } from '../repository/audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  async list(workspaceId: string, filters: any) {
    const { data, total } = await this.repo.findByWorkspace(workspaceId, filters);

    return {
      data: data.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        oldValue: log.oldValue,
        newValue: log.newValue,
        actor: log.actor ? {
          id: log.actor.id,
          firstName: log.actor.firstName,
          lastName: log.actor.lastName,
          username: log.actor.username,
        } : null,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString(),
      })),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async log(data: {
    workspaceId: string; userId?: string; action: string;
    entityType: string; entityId: string;
    oldValue?: any; newValue?: any;
    ipAddress?: string; userAgent?: string;
  }) {
    return this.repo.create(data);
  }
}
```

- [ ] **Step 4: Create controller**

```typescript
// backend/src/audit/controller/audit.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from '../service/audit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { auditQuerySchema } from '../dto/audit-query.dto';

@Controller('workspaces/:wid/audit-logs')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Roles('WORKSPACE_OWNER', 'ADMIN')
  list(
    @Param('wid') wid: string,
    @Query(new ZodValidationPipe(auditQuerySchema)) query: any,
  ) {
    return this.audit.list(wid, query);
  }
}
```

- [ ] **Step 5: Create module and register**

```typescript
// backend/src/audit/audit.module.ts
import { Module } from '@nestjs/common';
import { AuditController } from './controller/audit.controller';
import { AuditService } from './service/audit.service';
import { AuditRepository } from './repository/audit.repository';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditRepository],
  exports: [AuditService],
})
export class AuditModule {}
```

Add `AuditModule` to `app.module.ts` imports.

- [ ] **Step 6: Commit**

```bash
git add backend/src/audit/ backend/src/app.module.ts
git commit -m "feat: add audit module with paginated, filterable log endpoint"
```

---

## Chunk 2: Complex Modules

### Task 8: Tickets Module (State Machine)

**Files:**
- Create: `backend/src/tickets/tickets.module.ts`
- Create: `backend/src/tickets/repository/tickets.repository.ts`
- Create: `backend/src/tickets/service/tickets.service.ts`
- Create: `backend/src/tickets/state-machine/ticket-state-machine.ts`
- Create: `backend/src/tickets/state-machine/ticket-state-machine.spec.ts`
- Create: `backend/src/tickets/controller/tickets.controller.ts`
- Create: `backend/src/tickets/dto/ticket.dto.ts`
- Create: `backend/src/tickets/service/tickets.service.spec.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create state machine with TDD — write failing test first**

```typescript
// backend/src/tickets/state-machine/ticket-state-machine.spec.ts
import { TicketStateMachine } from './ticket-state-machine';

describe('TicketStateMachine', () => {
  it('allows NEW -> IN_PROGRESS', () => {
    expect(TicketStateMachine.canTransition('NEW', 'IN_PROGRESS')).toBe(true);
  });

  it('allows IN_PROGRESS -> WAITING_CUSTOMER', () => {
    expect(TicketStateMachine.canTransition('IN_PROGRESS', 'WAITING_CUSTOMER')).toBe(true);
  });

  it('allows IN_PROGRESS -> RESOLVED', () => {
    expect(TicketStateMachine.canTransition('IN_PROGRESS', 'RESOLVED')).toBe(true);
  });

  it('allows RESOLVED -> CLOSED', () => {
    expect(TicketStateMachine.canTransition('RESOLVED', 'CLOSED')).toBe(true);
  });

  it('blocks CLOSED -> anything', () => {
    expect(TicketStateMachine.canTransition('CLOSED', 'NEW')).toBe(false);
    expect(TicketStateMachine.canTransition('CLOSED', 'IN_PROGRESS')).toBe(false);
  });

  it('blocks NEW -> CLOSED directly', () => {
    expect(TicketStateMachine.canTransition('NEW', 'CLOSED')).toBe(false);
  });

  it('allows NEW -> SPAM', () => {
    expect(TicketStateMachine.canTransition('NEW', 'SPAM')).toBe(true);
  });

  it('blocks SPAM -> anything', () => {
    expect(TicketStateMachine.canTransition('SPAM', 'NEW')).toBe(false);
  });

  it('assertTransition throws for invalid transition', () => {
    expect(() => TicketStateMachine.assertTransition('CLOSED', 'NEW')).toThrow('INVALID_STATE_TRANSITION');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest ticket-state-machine.spec --no-coverage`
Expected: FAIL — module not found

- [ ] **Step 3: Implement state machine**

```typescript
// backend/src/tickets/state-machine/ticket-state-machine.ts
import { UnprocessableEntityException } from '@nestjs/common';
import { TICKET_TRANSITIONS } from '@crm/shared';

export class TicketStateMachine {
  static canTransition(from: string, to: string): boolean {
    const allowed = TICKET_TRANSITIONS[from];
    if (!allowed) return false;
    return allowed.includes(to);
  }

  static assertTransition(from: string, to: string): void {
    if (!this.canTransition(from, to)) {
      throw new UnprocessableEntityException('INVALID_STATE_TRANSITION');
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest ticket-state-machine.spec --no-coverage`
Expected: 9 tests PASS

- [ ] **Step 5: Create DTOs**

```typescript
// backend/src/tickets/dto/ticket.dto.ts
import { z } from 'zod';
import { paginationSchema, rateTicketSchema } from '@crm/shared';

export const createTicketSchema = z.object({
  serviceId: z.string().min(1),
  message: z.string().min(1).max(10000).optional(),
});

export const ticketListQuerySchema = paginationSchema.extend({
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeId: z.string().optional(),
  serviceId: z.string().optional(),
  search: z.string().optional(),
});

export const updateTicketSchema = z.object({
  status: z.enum(['NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER', 'RESOLVED', 'CLOSED', 'SPAM', 'DUPLICATE']).optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  title: z.string().max(500).optional(),
  summary: z.string().max(5000).optional(),
});

export { rateTicketSchema };
```

- [ ] **Step 6: Create repository**

```typescript
// backend/src/tickets/repository/tickets.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TicketStatus } from '@prisma/client';

@Injectable()
export class TicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string, filters: {
    status?: string; priority?: string; assigneeId?: string;
    serviceId?: string; search?: string; customerId?: string;
    page: number; limit: number;
  }) {
    const where: any = { workspaceId, isDeleted: false };
    if (filters.status) where.status = filters.status;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.serviceId) where.serviceId = filters.serviceId;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.search) {
      where.OR = [
        { ticketNumber: { contains: filters.search, mode: 'insensitive' } },
        { title: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          customer: { include: { user: { select: { firstName: true, lastName: true } } } },
          service: { select: { name: true } },
          assignee: { include: { user: { select: { firstName: true, lastName: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { text: true, createdAt: true } },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { data, total };
  }

  async getCounters(workspaceId: string) {
    const [newCount, inProgress, waiting, slaOverdue] = await Promise.all([
      this.prisma.ticket.count({ where: { workspaceId, status: 'NEW', isDeleted: false } }),
      this.prisma.ticket.count({ where: { workspaceId, status: 'IN_PROGRESS', isDeleted: false } }),
      this.prisma.ticket.count({ where: { workspaceId, status: 'WAITING_CUSTOMER', isDeleted: false } }),
      this.prisma.ticket.count({ where: { workspaceId, isDeleted: false, slaDeadline: { lt: new Date() }, status: { in: ['NEW', 'IN_PROGRESS', 'WAITING_CUSTOMER'] } } }),
    ]);
    return { new: newCount, inProgress, waitingCustomer: waiting, slaOverdue };
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.ticket.findFirst({
      where: { id, workspaceId, isDeleted: false },
      include: {
        customer: { include: { user: { select: { id: true, firstName: true, lastName: true, username: true, photoUrl: true } } } },
        service: { select: { id: true, name: true } },
        assignee: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
  }

  async update(id: string, data: any, version?: number) {
    const where: any = { id };
    if (version !== undefined) where.version = version;
    return this.prisma.ticket.update({
      where,
      data: { ...data, version: { increment: 1 } },
    });
  }

  async rate(id: string, rating: number, comment?: string) {
    return this.prisma.ticket.update({
      where: { id },
      data: { rating, ratingComment: comment, status: 'CLOSED', closedAt: new Date() },
    });
  }
}
```

- [ ] **Step 7: Create service**

```typescript
// backend/src/tickets/service/tickets.service.ts
import { Injectable, NotFoundException, ConflictException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { TicketsRepository } from '../repository/tickets.repository';
import { TicketStateMachine } from '../state-machine/ticket-state-machine';

@Injectable()
export class TicketsService {
  constructor(
    private readonly repo: TicketsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(workspaceId: string, dto: { serviceId: string; message?: string }, userId: string) {
    // Resolve customer profile
    const profile = await this.prisma.customerProfile.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    });
    if (!profile) throw new ForbiddenException('FORBIDDEN');

    const service = await this.prisma.service.findFirst({
      where: { id: dto.serviceId, workspaceId, isActive: true },
    });
    if (!service) throw new NotFoundException('SERVICE_NOT_FOUND');

    // Generate ticket number atomically
    return this.prisma.$transaction(async (tx) => {
      const [counter] = await tx.$queryRaw<{ lastValue: number }[]>`
        SELECT "lastValue" FROM "WorkspaceCounter"
        WHERE "workspaceId" = ${workspaceId} AND "counterType" = 'ticket'
        FOR UPDATE
      `;
      const nextTicket = (counter?.lastValue ?? 0) + 1;
      await tx.$queryRaw`
        UPDATE "WorkspaceCounter" SET "lastValue" = ${nextTicket}
        WHERE "workspaceId" = ${workspaceId} AND "counterType" = 'ticket'
      `;
      const year = new Date().getFullYear();
      const ticketNumber = `T-${year}-${String(nextTicket).padStart(6, '0')}`;

      const ticket = await tx.ticket.create({
        data: {
          workspaceId,
          serviceId: service.id,
          customerId: profile.id,
          ticketNumber,
          slaDeadline: new Date(Date.now() + service.slaMinutes * 60 * 1000),
        },
      });

      return ticket;
    });
  }

  async list(workspaceId: string, filters: any, userRole: string, userId?: string) {
    // CUSTOMER only sees own tickets — resolve customerProfileId
    if (userRole === 'CUSTOMER' && userId) {
      const profile = await this.prisma.customerProfile.findUnique({
        where: { userId_workspaceId: { userId, workspaceId } },
        select: { id: true },
      });
      if (!profile) return { data: [], meta: { page: filters.page, limit: filters.limit, total: 0, totalPages: 0 }, counters: { new: 0, inProgress: 0, waitingCustomer: 0, slaOverdue: 0 } };
      filters.customerId = profile.id;
    }

    const { data, total } = await this.repo.findByWorkspace(workspaceId, filters);
    const counters = await this.repo.getCounters(workspaceId);

    return {
      data: data.map((t) => this.formatListItem(t)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
      counters,
    };
  }

  async getById(workspaceId: string, ticketId: string, userRole: string, userId?: string) {
    const ticket = await this.repo.findById(ticketId, workspaceId);
    if (!ticket) throw new NotFoundException('TICKET_NOT_FOUND');

    // CUSTOMER can only see own tickets
    if (userRole === 'CUSTOMER' && ticket.customer.userId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    return this.formatDetail(ticket);
  }

  async update(workspaceId: string, ticketId: string, dto: any, version?: number) {
    const ticket = await this.repo.findById(ticketId, workspaceId);
    if (!ticket) throw new NotFoundException('TICKET_NOT_FOUND');

    // Validate state transition if status change
    if (dto.status && dto.status !== ticket.status) {
      TicketStateMachine.assertTransition(ticket.status, dto.status);

      // RESOLVED -> IN_PROGRESS limited to 7 days after resolution
      if (ticket.status === 'RESOLVED' && dto.status === 'IN_PROGRESS' && ticket.resolvedAt) {
        const daysSinceResolved = (Date.now() - new Date(ticket.resolvedAt).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceResolved > 7) {
          throw new UnprocessableEntityException('INVALID_STATE_TRANSITION');
        }
      }
    }

    // Set timestamps on status transitions
    const data: any = { ...dto };
    if (dto.status === 'RESOLVED' && ticket.status !== 'RESOLVED') {
      data.resolvedAt = new Date();
    }
    if (dto.status === 'CLOSED' && ticket.status !== 'CLOSED') {
      data.closedAt = new Date();
    }

    try {
      const updated = await this.repo.update(ticketId, data, version);
      return updated;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new ConflictException('CONFLICT');
      }
      throw e;
    }
  }

  async rate(workspaceId: string, ticketId: string, userId: string, rating: number, comment?: string) {
    const ticket = await this.repo.findById(ticketId, workspaceId);
    if (!ticket) throw new NotFoundException('TICKET_NOT_FOUND');

    if (ticket.customer.userId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
      throw new UnprocessableEntityException('INVALID_STATE_TRANSITION');
    }

    return this.repo.rate(ticketId, rating, comment);
  }

  private formatListItem(t: any) {
    return {
      id: t.id, ticketNumber: t.ticketNumber, status: t.status,
      priority: t.priority, title: t.title, tags: t.tags,
      slaDeadline: t.slaDeadline?.toISOString() ?? null,
      version: t.version,
      customerName: `${t.customer.user.firstName} ${t.customer.user.lastName || ''}`.trim(),
      customerNumber: t.customer.clientNumber,
      serviceName: t.service.name,
      assigneeName: t.assignee ? `${t.assignee.user.firstName} ${t.assignee.user.lastName || ''}`.trim() : null,
      lastMessage: t.messages[0]?.text ?? null,
      lastMessageAt: t.messages[0]?.createdAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }

  private formatDetail(t: any) {
    return {
      id: t.id, ticketNumber: t.ticketNumber, status: t.status,
      priority: t.priority, title: t.title, summary: t.summary,
      tags: t.tags,
      firstResponseAt: t.firstResponseAt?.toISOString() ?? null,
      resolvedAt: t.resolvedAt?.toISOString() ?? null,
      closedAt: t.closedAt?.toISOString() ?? null,
      slaDeadline: t.slaDeadline?.toISOString() ?? null,
      rating: t.rating, ratingComment: t.ratingComment,
      version: t.version,
      service: t.service,
      customer: {
        id: t.customer.id,
        clientNumber: t.customer.clientNumber,
        userId: t.customer.user.id,
        firstName: t.customer.user.firstName,
        lastName: t.customer.user.lastName,
        username: t.customer.user.username,
        photoUrl: t.customer.user.photoUrl,
      },
      assignee: t.assignee ? {
        id: t.assignee.id,
        userId: t.assignee.user.id,
        firstName: t.assignee.user.firstName,
        lastName: t.assignee.user.lastName,
      } : null,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
```

- [ ] **Step 8: Write service test**

```typescript
// backend/src/tickets/service/tickets.service.spec.ts
import { Test } from '@nestjs/testing';
import { TicketsService } from './tickets.service';
import { TicketsRepository } from '../repository/tickets.repository';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotFoundException, ForbiddenException, UnprocessableEntityException } from '@nestjs/common';

describe('TicketsService', () => {
  let service: TicketsService;
  let repo: jest.Mocked<TicketsRepository>;

  const mockTicket = {
    id: 't1', ticketNumber: 'T-2026-000001', status: 'NEW', priority: 'NORMAL',
    title: null, summary: null, tags: [], slaDeadline: null, rating: null,
    ratingComment: null, version: 1, isDeleted: false, firstResponseAt: null,
    resolvedAt: null, closedAt: null,
    createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
    customer: { id: 'cp1', clientNumber: 'C-000001', userId: 'u1',
      user: { id: 'u1', firstName: 'Alice', lastName: null, username: 'alice', photoUrl: null } },
    service: { id: 's1', name: 'Support' },
    assignee: null,
  } as any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TicketsService,
        {
          provide: TicketsRepository,
          useValue: {
            findByWorkspace: jest.fn(), getCounters: jest.fn(),
            findById: jest.fn(), update: jest.fn(), rate: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            customerProfile: { findUnique: jest.fn() },
            service: { findFirst: jest.fn() },
            $transaction: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(TicketsService);
    repo = module.get(TicketsRepository);
  });

  it('getById throws NotFoundException for missing ticket', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('w1', 'bad', 'ADMIN')).rejects.toThrow(NotFoundException);
  });

  it('getById throws ForbiddenException for CUSTOMER viewing other ticket', async () => {
    repo.findById.mockResolvedValue(mockTicket);
    await expect(service.getById('w1', 't1', 'CUSTOMER', 'other-user')).rejects.toThrow(ForbiddenException);
  });

  it('update validates state machine transitions', async () => {
    repo.findById.mockResolvedValue(mockTicket);
    await expect(service.update('w1', 't1', { status: 'CLOSED' }, 1)).rejects.toThrow(UnprocessableEntityException);
  });

  it('update allows valid transition NEW -> IN_PROGRESS', async () => {
    repo.findById.mockResolvedValue(mockTicket);
    repo.update.mockResolvedValue({ ...mockTicket, status: 'IN_PROGRESS' });
    const result = await service.update('w1', 't1', { status: 'IN_PROGRESS' }, 1);
    expect(result.status).toBe('IN_PROGRESS');
  });

  it('rate throws ForbiddenException for non-customer', async () => {
    repo.findById.mockResolvedValue(mockTicket);
    await expect(service.rate('w1', 't1', 'other-user', 5)).rejects.toThrow(ForbiddenException);
  });

  it('rate throws for non-resolved ticket', async () => {
    repo.findById.mockResolvedValue(mockTicket); // status is NEW
    await expect(service.rate('w1', 't1', 'u1', 5)).rejects.toThrow(UnprocessableEntityException);
  });
});
```

- [ ] **Step 9: Run tests, verify pass**

Run: `cd backend && npx jest --testPathPattern="tickets" --no-coverage`
Expected: All tests PASS (state machine + service)

- [ ] **Step 10: Create controller**

```typescript
// backend/src/tickets/controller/tickets.controller.ts
import { Controller, Get, Patch, Post, Param, Query, Body, Headers, UseGuards } from '@nestjs/common';
import { TicketsService } from '../service/tickets.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ticketListQuerySchema, updateTicketSchema, createTicketSchema, rateTicketSchema } from '../dto/ticket.dto';

@Controller('workspaces/:wid/tickets')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  create(
    @Param('wid') wid: string,
    @Body(new ZodValidationPipe(createTicketSchema)) dto: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tickets.create(wid, dto, user.userId);
  }

  @Get()
  list(
    @Param('wid') wid: string,
    @Query(new ZodValidationPipe(ticketListQuerySchema)) query: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tickets.list(wid, query, user.role, user.userId);
  }

  @Get(':tid')
  getById(
    @Param('wid') wid: string,
    @Param('tid') tid: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.tickets.getById(wid, tid, user.role, user.userId);
  }

  @Patch(':tid')
  @UseGuards(RolesGuard)
  @Roles('WORKSPACE_OWNER', 'ADMIN', 'AGENT')
  update(
    @Param('wid') wid: string,
    @Param('tid') tid: string,
    @Body(new ZodValidationPipe(updateTicketSchema)) dto: any,
    @Headers('if-match') ifMatch?: string,
  ) {
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, ''), 10) : undefined;
    return this.tickets.update(wid, tid, dto, version);
  }

  @Post(':tid/rate')
  @UseGuards(RolesGuard)
  @Roles('CUSTOMER')
  rate(
    @Param('wid') wid: string,
    @Param('tid') tid: string,
    @CurrentUser() user: CurrentUserData,
    @Body(new ZodValidationPipe(rateTicketSchema)) dto: any,
  ) {
    return this.tickets.rate(wid, tid, user.userId, dto.rating, dto.comment);
  }
}
```

- [ ] **Step 11: Create module and register**

```typescript
// backend/src/tickets/tickets.module.ts
import { Module } from '@nestjs/common';
import { TicketsController } from './controller/tickets.controller';
import { TicketsService } from './service/tickets.service';
import { TicketsRepository } from './repository/tickets.repository';

@Module({
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService, TicketsRepository],
})
export class TicketsModule {}
```

Add `TicketsModule` to `app.module.ts` imports.

- [ ] **Step 12: Commit**

```bash
git add backend/src/tickets/ backend/src/app.module.ts
git commit -m "feat: add tickets module with state machine, pagination, KPI counters"
```

---

### Task 9: Messages Module (Cursor Pagination)

**Files:**
- Create: `backend/src/messages/messages.module.ts`
- Create: `backend/src/messages/repository/messages.repository.ts`
- Create: `backend/src/messages/service/messages.service.ts`
- Create: `backend/src/messages/controller/messages.controller.ts`
- Create: `backend/src/messages/service/messages.service.spec.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create repository with cursor pagination and eventSeq generation**

```typescript
// backend/src/messages/repository/messages.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class MessagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTicket(workspaceId: string, ticketId: string, options: { before?: string; limit: number }, excludeNotes: boolean) {
    const where: any = { ticketId, workspaceId, isDeleted: false };
    if (excludeNotes) where.type = { not: 'NOTE' };
    if (options.before) {
      const cursor = await this.prisma.message.findUnique({ where: { id: options.before }, select: { createdAt: true } });
      if (cursor) where.createdAt = { lt: cursor.createdAt };
    }

    const messages = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options.limit + 1, // fetch one extra to determine hasMore
      include: {
        author: { select: { id: true, firstName: true, lastName: true } },
        attachments: true,
        reactions: { include: { user: { select: { id: true } } } },
      },
    });

    const hasMore = messages.length > options.limit;
    if (hasMore) messages.pop();

    return { messages: messages.reverse(), hasMore };
  }

  async createWithSeq(ticketId: string, workspaceId: string, data: {
    type: string; authorType: string; text: string;
    authorUserId: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      // Lock ticket row to serialize eventSeq
      await tx.$queryRaw`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`;

      const [{ max }] = await tx.$queryRaw<{ max: number | null }[]>`
        SELECT MAX("eventSeq") as max FROM "Message" WHERE "ticketId" = ${ticketId}
      `;
      const nextSeq = (max ?? 0) + 1;

      return tx.message.create({
        data: {
          ...data,
          ticketId,
          workspaceId,
          eventSeq: nextSeq,
        } as any,
        include: {
          author: { select: { id: true, firstName: true, lastName: true } },
          attachments: true,
          reactions: true,
        },
      });
    });
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.message.findFirst({
      where: { id, workspaceId },
      include: { ticket: { select: { workspaceId: true } } },
    });
  }

  async update(id: string, text: string, version: number) {
    return this.prisma.message.update({
      where: { id, version },
      data: { text, isEdited: true, version: { increment: 1 } },
    });
  }

  async softDelete(id: string) {
    return this.prisma.message.update({
      where: { id },
      data: { isDeleted: true, text: null },
    });
  }
}
```

- [ ] **Step 2: Create service**

```typescript
// backend/src/messages/service/messages.service.ts
import { Injectable, NotFoundException, ForbiddenException, UnprocessableEntityException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MessagesRepository } from '../repository/messages.repository';
import { LIMITS } from '@crm/shared';

@Injectable()
export class MessagesService {
  constructor(private readonly repo: MessagesRepository) {}

  async list(workspaceId: string, ticketId: string, options: { before?: string; limit: number }, userRole: string, userId?: string) {
    const excludeNotes = userRole === 'CUSTOMER';
    const { messages, hasMore } = await this.repo.findByTicket(workspaceId, ticketId, options, excludeNotes);

    return {
      data: messages.map((m) => this.formatMessage(m, userId)),
      meta: { hasMore, nextCursor: hasMore ? messages[0]?.id ?? null : null },
    };
  }

  async send(ticketId: string, workspaceId: string, dto: { text: string; type: string }, userId: string, userRole: string) {
    // Only AGENT/ADMIN can send NOTEs
    if (dto.type === 'NOTE' && userRole === 'CUSTOMER') {
      throw new ForbiddenException('FORBIDDEN');
    }

    const authorType = userRole === 'CUSTOMER' ? 'CUSTOMER' : 'AGENT';

    const message = await this.repo.createWithSeq(ticketId, workspaceId, {
      type: dto.type,
      authorType,
      text: dto.text,
      authorUserId: userId,
    });

    return this.formatMessage(message, userId);
  }

  async edit(workspaceId: string, messageId: string, text: string, userId: string, version?: number) {
    const message = await this.repo.findById(messageId, workspaceId);
    if (!message) throw new NotFoundException('MESSAGE_NOT_FOUND');

    if (message.authorUserId !== userId) {
      throw new ForbiddenException('FORBIDDEN');
    }

    // Check 5-minute edit window
    const elapsed = Date.now() - message.createdAt.getTime();
    if (elapsed > LIMITS.MESSAGE_EDIT_WINDOW_MS) {
      throw new UnprocessableEntityException('EDIT_WINDOW_EXPIRED');
    }

    if (version !== undefined) {
      try {
        return await this.repo.update(messageId, text, version);
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
          throw new ConflictException('CONFLICT');
        }
        throw e;
      }
    }
    return this.repo.update(messageId, text, message.version);
  }

  async delete(workspaceId: string, messageId: string, userId: string, userRole: string) {
    const message = await this.repo.findById(messageId, workspaceId);
    if (!message) throw new NotFoundException('MESSAGE_NOT_FOUND');

    // Author or ADMIN can delete
    if (message.authorUserId !== userId && !['ADMIN', 'WORKSPACE_OWNER'].includes(userRole)) {
      throw new ForbiddenException('FORBIDDEN');
    }

    await this.repo.softDelete(messageId);
  }

  private formatMessage(m: any, currentUserId?: string) {
    return {
      id: m.id,
      type: m.type,
      authorType: m.authorType,
      text: m.text,
      isEdited: m.isEdited,
      isDeleted: m.isDeleted,
      deliveredAt: m.deliveredAt?.toISOString() ?? null,
      readAt: m.readAt?.toISOString() ?? null,
      eventSeq: m.eventSeq,
      version: m.version,
      authorUserId: m.authorUserId,
      authorName: m.author ? `${m.author.firstName} ${m.author.lastName || ''}`.trim() : null,
      ticketId: m.ticketId,
      attachments: (m.attachments || []).map((a: any) => ({
        id: a.id, originalName: a.originalName, mimeType: a.mimeType,
        sizeBytes: a.sizeBytes, previewUrl: a.previewUrl, scanStatus: a.scanStatus,
        createdAt: a.createdAt.toISOString(),
      })),
      reactions: this.aggregateReactions(m.reactions || [], currentUserId),
      createdAt: m.createdAt.toISOString(),
    };
  }

  private aggregateReactions(reactions: any[], currentUserId?: string) {
    const map = new Map<string, { emoji: string; userIds: string[] }>();
    for (const r of reactions) {
      if (!map.has(r.emoji)) map.set(r.emoji, { emoji: r.emoji, userIds: [] });
      map.get(r.emoji)!.userIds.push(r.userId);
    }
    return Array.from(map.values()).map((r) => ({
      emoji: r.emoji, count: r.userIds.length, userIds: r.userIds,
      myReaction: currentUserId ? r.userIds.includes(currentUserId) : false,
    }));
  }
}
```

- [ ] **Step 3: Write test**

```typescript
// backend/src/messages/service/messages.service.spec.ts
import { Test } from '@nestjs/testing';
import { MessagesService } from './messages.service';
import { MessagesRepository } from '../repository/messages.repository';
import { ForbiddenException, UnprocessableEntityException, NotFoundException } from '@nestjs/common';

describe('MessagesService', () => {
  let service: MessagesService;
  let repo: jest.Mocked<MessagesRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: MessagesRepository,
          useValue: {
            findByTicket: jest.fn(), createWithSeq: jest.fn(),
            findById: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
          },
        },
      ],
    }).compile();
    service = module.get(MessagesService);
    repo = module.get(MessagesRepository);
  });

  it('send rejects NOTE from CUSTOMER', async () => {
    await expect(
      service.send('t1', 'w1', { text: 'hi', type: 'NOTE' }, 'u1', 'CUSTOMER'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('edit rejects after 5-minute window', async () => {
    repo.findById.mockResolvedValue({
      id: 'm1', authorUserId: 'u1', version: 1,
      createdAt: new Date(Date.now() - 10 * 60 * 1000), // 10 min ago
    } as any);
    await expect(service.edit('w1', 'm1', 'new text', 'u1', 1)).rejects.toThrow(UnprocessableEntityException);
  });

  it('edit rejects non-author', async () => {
    repo.findById.mockResolvedValue({
      id: 'm1', authorUserId: 'u1', version: 1,
      createdAt: new Date(), // recent
    } as any);
    await expect(service.edit('w1', 'm1', 'new text', 'other-user', 1)).rejects.toThrow(ForbiddenException);
  });

  it('delete allows ADMIN to delete any message', async () => {
    repo.findById.mockResolvedValue({ id: 'm1', authorUserId: 'u2' } as any);
    repo.softDelete.mockResolvedValue({} as any);
    await service.delete('w1', 'm1', 'admin-user', 'ADMIN');
    expect(repo.softDelete).toHaveBeenCalledWith('m1');
  });

  it('delete rejects non-author non-admin', async () => {
    repo.findById.mockResolvedValue({ id: 'm1', authorUserId: 'u2' } as any);
    await expect(service.delete('w1', 'm1', 'u3', 'AGENT')).rejects.toThrow(ForbiddenException);
  });
});
```

- [ ] **Step 4: Run test, verify pass**

Run: `cd backend && npx jest messages.service.spec --no-coverage`
Expected: 5 tests PASS

- [ ] **Step 5: Create controller**

```typescript
// backend/src/messages/controller/messages.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Headers, UseGuards, HttpCode } from '@nestjs/common';
import { MessagesService } from '../service/messages.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { CurrentUser, CurrentUserData } from '../../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { cursorPaginationSchema, sendMessageSchema } from '@crm/shared';

@Controller('workspaces/:wid/tickets/:tid/messages')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard)
export class MessagesController {
  constructor(private readonly messages: MessagesService) {}

  @Get()
  list(
    @Param('wid') wid: string,
    @Param('tid') tid: string,
    @Query(new ZodValidationPipe(cursorPaginationSchema)) query: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.messages.list(wid, tid, query, user.role, user.userId);
  }

  @Post()
  send(
    @Param('wid') wid: string,
    @Param('tid') tid: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) dto: any,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.messages.send(tid, wid, dto, user.userId, user.role);
  }

  @Patch(':mid')
  edit(
    @Param('wid') wid: string,
    @Param('mid') mid: string,
    @Body() body: { text: string },
    @Headers('if-match') ifMatch?: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, ''), 10) : undefined;
    return this.messages.edit(wid, mid, body.text, user.userId, version);
  }

  @Delete(':mid')
  @HttpCode(204)
  async remove(
    @Param('wid') wid: string,
    @Param('mid') mid: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.messages.delete(wid, mid, user.userId, user.role);
  }
}
```

- [ ] **Step 6: Create module and register**

```typescript
// backend/src/messages/messages.module.ts
import { Module } from '@nestjs/common';
import { MessagesController } from './controller/messages.controller';
import { MessagesService } from './service/messages.service';
import { MessagesRepository } from './repository/messages.repository';

@Module({
  controllers: [MessagesController],
  providers: [MessagesService, MessagesRepository],
  exports: [MessagesService, MessagesRepository],
})
export class MessagesModule {}
```

Add `MessagesModule` to `app.module.ts` imports.

- [ ] **Step 7: Commit**

```bash
git add backend/src/messages/ backend/src/app.module.ts
git commit -m "feat: add messages module with cursor pagination, eventSeq, edit window"
```

---

### Task 10: Customers Module

**Files:**
- Create: `backend/src/customers/customers.module.ts`
- Create: `backend/src/customers/repository/customers.repository.ts`
- Create: `backend/src/customers/service/customers.service.ts`
- Create: `backend/src/customers/controller/customers.controller.ts`
- Create: `backend/src/customers/dto/customer.dto.ts`
- Create: `backend/src/customers/service/customers.service.spec.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create DTO**

```typescript
// backend/src/customers/dto/customer.dto.ts
import { z } from 'zod';
import { paginationSchema } from '@crm/shared';

export const customerListQuerySchema = paginationSchema.extend({
  search: z.string().optional(),
  isBanned: z.coerce.boolean().optional(),
});

export const updateCustomerSchema = z.object({
  notes: z.string().max(5000).nullable().optional(),
  segment: z.string().max(200).nullable().optional(),
  isBanned: z.boolean().optional(),
  banReason: z.string().max(500).nullable().optional(),
  customFields: z.record(z.unknown()).optional(),
});
```

- [ ] **Step 2: Create repository**

```typescript
// backend/src/customers/repository/customers.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class CustomersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByWorkspace(workspaceId: string, filters: {
    search?: string; isBanned?: boolean; page: number; limit: number;
  }) {
    const where: any = { workspaceId, isDeleted: false };
    if (filters.isBanned !== undefined) where.isBanned = filters.isBanned;
    if (filters.search) {
      where.OR = [
        { clientNumber: { contains: filters.search, mode: 'insensitive' } },
        { user: { firstName: { contains: filters.search, mode: 'insensitive' } } },
        { user: { username: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.customerProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, username: true, photoUrl: true } },
          _count: { select: { tickets: true } },
        },
      }),
      this.prisma.customerProfile.count({ where }),
    ]);

    return { data, total };
  }

  async findById(id: string, workspaceId: string) {
    return this.prisma.customerProfile.findFirst({
      where: { id, workspaceId, isDeleted: false },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, username: true, photoUrl: true, telegramId: true } },
        tickets: {
          where: { isDeleted: false },
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, ticketNumber: true, status: true, priority: true, createdAt: true },
        },
      },
    });
  }

  async update(id: string, data: any, version?: number) {
    const where: any = { id };
    if (version !== undefined) where.version = version;
    return this.prisma.customerProfile.update({
      where,
      data: { ...data, version: { increment: 1 } },
    });
  }
}
```

- [ ] **Step 3: Create service**

```typescript
// backend/src/customers/service/customers.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CustomersRepository } from '../repository/customers.repository';

@Injectable()
export class CustomersService {
  constructor(private readonly repo: CustomersRepository) {}

  async list(workspaceId: string, filters: any) {
    const { data, total } = await this.repo.findByWorkspace(workspaceId, filters);

    return {
      data: data.map((c) => ({
        id: c.id,
        clientNumber: c.clientNumber,
        firstName: c.user.firstName,
        lastName: c.user.lastName,
        username: c.user.username,
        photoUrl: c.user.photoUrl,
        segment: c.segment,
        isBanned: c.isBanned,
        ticketCount: c._count.tickets,
        createdAt: c.createdAt.toISOString(),
      })),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  async getById(workspaceId: string, customerId: string) {
    const customer = await this.repo.findById(customerId, workspaceId);
    if (!customer) throw new NotFoundException('NOT_FOUND');

    return {
      id: customer.id,
      clientNumber: customer.clientNumber,
      userId: customer.user.id,
      telegramId: customer.user.telegramId.toString(),
      firstName: customer.user.firstName,
      lastName: customer.user.lastName,
      username: customer.user.username,
      photoUrl: customer.user.photoUrl,
      segment: customer.segment,
      notes: customer.notes,
      isBanned: customer.isBanned,
      banReason: customer.banReason,
      customFields: customer.customFields,
      version: customer.version,
      tickets: customer.tickets.map((t) => ({
        id: t.id, ticketNumber: t.ticketNumber,
        status: t.status, priority: t.priority,
        createdAt: t.createdAt.toISOString(),
      })),
      createdAt: customer.createdAt.toISOString(),
    };
  }

  async update(workspaceId: string, customerId: string, dto: any, version?: number) {
    const customer = await this.repo.findById(customerId, workspaceId);
    if (!customer) throw new NotFoundException('NOT_FOUND');

    try {
      const updated = await this.repo.update(customerId, dto, version);
      return updated;
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2025') {
        throw new ConflictException('CONFLICT');
      }
      throw e;
    }
  }
}
```

- [ ] **Step 4: Write test**

```typescript
// backend/src/customers/service/customers.service.spec.ts
import { Test } from '@nestjs/testing';
import { CustomersService } from './customers.service';
import { CustomersRepository } from '../repository/customers.repository';
import { NotFoundException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;
  let repo: jest.Mocked<CustomersRepository>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: CustomersRepository,
          useValue: { findByWorkspace: jest.fn(), findById: jest.fn(), update: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(CustomersService);
    repo = module.get(CustomersRepository);
  });

  it('getById throws NotFoundException for missing customer', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getById('w1', 'bad')).rejects.toThrow(NotFoundException);
  });

  it('list returns paginated results', async () => {
    repo.findByWorkspace.mockResolvedValue({
      data: [{
        id: 'cp1', clientNumber: 'C-000001', segment: null,
        isBanned: false, notes: null, banReason: null, customFields: {},
        version: 1, isDeleted: false, deletedAt: null,
        userId: 'u1', workspaceId: 'w1',
        createdAt: new Date('2026-01-01'), updatedAt: new Date('2026-01-01'),
        user: { id: 'u1', firstName: 'Alice', lastName: null, username: 'alice', photoUrl: null },
        _count: { tickets: 3 },
      }],
      total: 1,
    } as any);

    const result = await service.list('w1', { page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0].ticketCount).toBe(3);
    expect(result.meta.total).toBe(1);
  });
});
```

- [ ] **Step 5: Run test, verify pass**

Run: `cd backend && npx jest customers.service.spec --no-coverage`
Expected: 2 tests PASS

- [ ] **Step 6: Create controller**

```typescript
// backend/src/customers/controller/customers.controller.ts
import { Controller, Get, Patch, Param, Query, Body, Headers, UseGuards } from '@nestjs/common';
import { CustomersService } from '../service/customers.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceScopeGuard } from '../../common/guards/workspace-scope.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { customerListQuerySchema, updateCustomerSchema } from '../dto/customer.dto';

@Controller('workspaces/:wid/customers')
@UseGuards(JwtAuthGuard, WorkspaceScopeGuard, RolesGuard)
@Roles('WORKSPACE_OWNER', 'ADMIN', 'AGENT')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  list(
    @Param('wid') wid: string,
    @Query(new ZodValidationPipe(customerListQuerySchema)) query: any,
  ) {
    return this.customers.list(wid, query);
  }

  @Get(':cid')
  getById(@Param('wid') wid: string, @Param('cid') cid: string) {
    return this.customers.getById(wid, cid);
  }

  @Patch(':cid')
  update(
    @Param('wid') wid: string,
    @Param('cid') cid: string,
    @Body(new ZodValidationPipe(updateCustomerSchema)) dto: any,
    @Headers('if-match') ifMatch?: string,
  ) {
    const version = ifMatch ? parseInt(ifMatch.replace(/"/g, ''), 10) : undefined;
    return this.customers.update(wid, cid, dto, version);
  }
}
```

- [ ] **Step 7: Create module and register**

```typescript
// backend/src/customers/customers.module.ts
import { Module } from '@nestjs/common';
import { CustomersController } from './controller/customers.controller';
import { CustomersService } from './service/customers.service';
import { CustomersRepository } from './repository/customers.repository';

@Module({
  controllers: [CustomersController],
  providers: [CustomersService, CustomersRepository],
  exports: [CustomersService],
})
export class CustomersModule {}
```

Add `CustomersModule` to `app.module.ts` imports.

- [ ] **Step 8: Commit**

```bash
git add backend/src/customers/ backend/src/app.module.ts
git commit -m "feat: add customers module with search, pagination, optimistic locking"
```

---

### Task 11: Final AppModule integration + run all tests

**Files:**
- Verify: `backend/src/app.module.ts` has all modules imported

- [ ] **Step 1: Verify AppModule has all imports**

Final `app.module.ts` imports should contain:
```typescript
imports: [
  ConfigModule.forRoot({ isGlobal: true }),
  LoggerModule.forRoot({ ... }),
  PrismaModule,
  RedisModule,
  AuthModule,
  UsersModule,
  WorkspacesModule,
  ServicesModule,
  TeamModule,
  MacrosModule,
  CustomFieldsModule,
  AuditModule,
  TicketsModule,
  MessagesModule,
  CustomersModule,
],
```

- [ ] **Step 2: Run all unit tests**

Run: `cd backend && npx jest --no-coverage`
Expected: All tests PASS

- [ ] **Step 3: TypeScript typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A backend/src/
git commit -m "feat: integrate all feature modules into AppModule"
```
