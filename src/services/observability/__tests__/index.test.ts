import * as ObservabilityIndex from '../index';

describe('services/observability index barrel', () => {
  it('exports all observability components and utilities', () => {
    expect(ObservabilityIndex.observability).toBeDefined();
    expect(ObservabilityIndex.beforeSend).toBeDefined();
    expect(ObservabilityIndex.shouldSendToSentry).toBeDefined();
    expect(ObservabilityIndex.sanitizeSentryEvent).toBeDefined();
    expect(ObservabilityIndex.DevErrorBoundary).toBeDefined();
  });
});
