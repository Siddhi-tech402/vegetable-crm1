'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/hooks/useTheme';
import { FinancialYearProvider } from '@/hooks/useFinancialYear';
import { OnlineStatusProvider, useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useEffect } from 'react';

interface ProvidersProps {
  children: React.ReactNode;
}

// Offline banner shown at the top of the page
function OfflineBanner() {
  const { isOnline, lastOnlineAt } = useOnlineStatus();

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .catch((err) => console.warn('SW registration failed:', err));
    }
  }, []);

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-500 text-white text-sm font-medium px-4 py-2 flex items-center justify-center gap-2 shadow-md"
    >
      <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M6.343 6.343a9 9 0 000 12.728M9.172 9.172a5 5 0 000 7.072M12 12h.01" />
      </svg>
      <span>
        You are offline — showing cached data.
        {lastOnlineAt && (
          <span className="ml-1 opacity-80 text-xs">
            Last online: {lastOnlineAt.toLocaleTimeString()}
          </span>
        )}
      </span>
    </div>
  );
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <FinancialYearProvider>
          <OnlineStatusProvider>
            <OfflineBanner />
            {children}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#333',
                  color: '#fff',
                },
                success: {
                  style: {
                    background: '#22c55e',
                  },
                },
                error: {
                  style: {
                    background: '#ef4444',
                  },
                },
              }}
            />
          </OnlineStatusProvider>
        </FinancialYearProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}

