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
