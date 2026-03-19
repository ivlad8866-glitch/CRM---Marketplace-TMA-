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
