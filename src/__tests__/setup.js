import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock window.AndroidBridge for tests
vi.stubGlobal('AndroidBridge', undefined);
vi.stubGlobal('onNewSMS', undefined);
vi.stubGlobal('handleSMS', undefined);

// Mock IndexedDB for tests that touch localDB
const indexedDB = {
  open: vi.fn(),
};
vi.stubGlobal('indexedDB', indexedDB);
