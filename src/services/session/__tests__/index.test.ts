import * as SessionModule from '../index';

describe('services/session index barrel', () => {
  it('exports session coordinator, persistence classes, and types', () => {
    expect(SessionModule.SessionCoordinator).toBeDefined();
    expect(SessionModule.sessionCoordinator).toBeDefined();
    expect(SessionModule.SecureStoreSessionPersistence).toBeDefined();
    expect(SessionModule.InMemorySessionPersistence).toBeDefined();
  });
});
