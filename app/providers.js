'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';

export function Providers({ children }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f2040',
            border: '1px solid #1e3a6e',
            color: '#e2e8f0',
          },
        }}
      />
    </SessionProvider>
  );
}
