'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@/hooks/useTheme';
import { FinancialYearProvider } from '@/hooks/useFinancialYear';
import { OnlineStatusProvider } from '@/hooks/useOnlineStatus';

interface ProvidersProps {
  children: React.ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <FinancialYearProvider>
          <OnlineStatusProvider>
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
