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
