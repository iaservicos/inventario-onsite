'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { ThemeProvider } from './providers/ThemeProvider';

export function Providers({ children }) {
  return (
    <ThemeProvider>
      <SessionProvider>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
            },
          }}
        />
      </SessionProvider>
    </ThemeProvider>
  );
}
