import { MockSecureStorageAdapter } from '../mock-secure-storage.adapter';

describe('MockSecureStorageAdapter', () => {
  let adapter: MockSecureStorageAdapter;

  beforeEach(() => {
    adapter = new MockSecureStorageAdapter();
  });

  it('sets, gets, deletes, and clears items', async () => {
    expect(await adapter.getItem('k1')).toBeNull();

    await adapter.setItem('k1', 'v1');
    expect(await adapter.getItem('k1')).toBe('v1');

    await adapter.deleteItem('k1');
    expect(await adapter.getItem('k1')).toBeNull();

    await adapter.setItem('k2', 'v2');
    await adapter.clear();
    expect(await adapter.getItem('k2')).toBeNull();
  });
});
