import React, { createContext, useContext, useState, useCallback } from 'react';
import { storage, STORAGE_KEYS } from '../services/storage';
import { createFinanceSheet as createFinanceSheetService } from '../services/sheetCreator';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const getInitialConfig = () => ({
  spreadsheetId: storage.get(STORAGE_KEYS.SPREADSHEET_ID) || localStorage.getItem('finday_spreadsheet_id') || '',
  clientId: storage.get(STORAGE_KEYS.CLIENT_ID) || '',
  currency: 'INR',
  isGuest: storage.getBool(STORAGE_KEYS.GUEST_MODE) && !(storage.get(STORAGE_KEYS.SPREADSHEET_ID) || localStorage.getItem('finday_spreadsheet_id')),
});

const getInitialIsGuest = () => {
  const hasSheet = !!(storage.get(STORAGE_KEYS.SPREADSHEET_ID) || localStorage.getItem('finday_spreadsheet_id'));
  return storage.getBool(STORAGE_KEYS.GUEST_MODE) && !hasSheet;
};

const getInitialIsConnected = () =>
  !!(storage.get(STORAGE_KEYS.SPREADSHEET_ID) || localStorage.getItem('finday_spreadsheet_id')) ||
  storage.getBool(STORAGE_KEYS.GUEST_MODE);

export const AuthProvider = ({ children, setIsLoading }) => {
  const [config, setConfig] = useState(getInitialConfig);
  const [isConnected, setIsConnected] = useState(getInitialIsConnected);
  const [isGuest, setIsGuest] = useState(getInitialIsGuest);

  const createFinanceSheet = useCallback(async () => {
    await createFinanceSheetService({ setConfig, setIsLoading });
  }, [setIsLoading]);

  const setGuestMode = useCallback((enabled) => {
    setIsGuest(enabled);
    setIsConnected(enabled || !!config.spreadsheetId);
    storage.set(STORAGE_KEYS.GUEST_MODE, enabled);
    setConfig((prev) => ({ ...prev, isGuest: enabled }));
  }, [config.spreadsheetId]);

  const value = {
    config,
    setConfig,
    isConnected,
    setIsConnected,
    isGuest,
    setIsGuest,
    createFinanceSheet,
    setGuestMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
