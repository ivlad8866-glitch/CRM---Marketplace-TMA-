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
