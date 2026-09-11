import * as SecureStore from 'expo-secure-store';

import { ExpoSecureStoreAdapter } from '../expo-secure-store.adapter';

describe('ExpoSecureStoreAdapter', () => {
  let adapter: ExpoSecureStoreAdapter;

  beforeEach(() => {
    adapter = new ExpoSecureStoreAdapter();
    jest.clearAllMocks();
  });

  describe('getItem', () => {
    it('retrieves item successfully from SecureStore', async () => {
      jest.spyOn(SecureStore, 'getItemAsync').mockResolvedValueOnce('stored_value');

      const result = await adapter.getItem('my_key');
      expect(result).toBe('stored_value');
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith('my_key');
    });

    it('catches error, logs warning, and returns null on failure', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      jest.spyOn(SecureStore, 'getItemAsync').mockRejectedValueOnce(new Error('Read failure'));

      const result = await adapter.getItem('faulty_key');
      expect(result).toBeNull();
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ExpoSecureStoreAdapter] Failed to get item for key "faulty_key":'),
        expect.any(Error)
      );

      warnSpy.mockRestore();
    });
  });

  describe('setItem', () => {
    it('saves item successfully to SecureStore', async () => {
      jest.spyOn(SecureStore, 'setItemAsync').mockResolvedValueOnce(undefined);

      await adapter.setItem('my_key', 'my_val');
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('my_key', 'my_val');
    });

    it('catches error, logs warning, and rethrows on failure', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const setErr = new Error('Write failure');
      jest.spyOn(SecureStore, 'setItemAsync').mockRejectedValueOnce(setErr);

      await expect(adapter.setItem('faulty_key', 'val')).rejects.toThrow(setErr);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ExpoSecureStoreAdapter] Failed to set item for key "faulty_key":'),
        setErr
      );

      warnSpy.mockRestore();
    });
  });

  describe('deleteItem', () => {
    it('deletes item successfully from SecureStore', async () => {
      jest.spyOn(SecureStore, 'deleteItemAsync').mockResolvedValueOnce(undefined);

      await adapter.deleteItem('my_key');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('my_key');
    });

    it('catches error and logs warning on failure without rethrowing', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const delErr = new Error('Delete failure');
      jest.spyOn(SecureStore, 'deleteItemAsync').mockRejectedValueOnce(delErr);

      await adapter.deleteItem('faulty_key');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[ExpoSecureStoreAdapter] Failed to delete item for key "faulty_key":'),
        delErr
      );

      warnSpy.mockRestore();
    });
  });
});
