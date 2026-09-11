import * as BiometricsModule from '../index';

describe('biometrics barrel exports', () => {
  it('exports BiometricService', () => {
    expect(BiometricsModule.BiometricService).toBeDefined();
    expect(typeof BiometricsModule.BiometricService.getCapabilities).toBe('function');
    expect(typeof BiometricsModule.BiometricService.authenticate).toBe('function');
  });
});
