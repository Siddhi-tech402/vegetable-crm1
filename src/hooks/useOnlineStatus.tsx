'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface OnlineStatusContextType {
  isOnline: boolean;
  lastOnlineAt: Date | null;
}

const OnlineStatusContext = createContext<OnlineStatusContextType | undefined>(undefined);

export function OnlineStatusProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);
    if (navigator.onLine) {
      setLastOnlineAt(new Date());
    }

    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <OnlineStatusContext.Provider value={{ isOnline, lastOnlineAt }}>
      {children}
    </OnlineStatusContext.Provider>
  );
}

export function useOnlineStatus() {
  const context = useContext(OnlineStatusContext);
  if (context === undefined) {
    throw new Error('useOnlineStatus must be used within an OnlineStatusProvider');
  }
  return context;
}
