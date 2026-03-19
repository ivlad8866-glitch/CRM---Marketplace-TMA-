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
