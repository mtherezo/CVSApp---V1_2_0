// src/contexts/AppContext.tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  isDbReady: boolean;
  setIsDbReady: (isReady: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isDbReady, setIsDbReady] = useState(false);

  return (
    <AppContext.Provider value={{ isDbReady, setIsDbReady }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext deve ser usado dentro de um AppProvider');
  }
  return context;
}