import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREMIUM_KEY = '@isUserPremium';

interface PremiumContextType {
  isPremium: boolean;
  checkPremiumStatus: () => Promise<void>;
  unlockPremium: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState(false);

  const checkPremiumStatus = async () => {
    const status = await AsyncStorage.getItem(PREMIUM_KEY);
    setIsPremium(status === 'true');
  };

  useEffect(() => {
    checkPremiumStatus();
  }, []);

  const unlockPremium = async () => {
    await AsyncStorage.setItem(PREMIUM_KEY, 'true');
    setIsPremium(true);
  };

  return (
    <PremiumContext.Provider value={{ isPremium, checkPremiumStatus, unlockPremium }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (!context) {
    throw new Error('usePremium deve ser usado dentro de um PremiumProvider');
  }
  return context;
}
