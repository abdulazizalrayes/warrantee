'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

type ContextMode = 'buyer' | 'seller';

interface ContextSwitcherProps {
  companyRole: 'vendor' | 'client' | 'both';
  buyerPendingCount?: number;
  sellerPendingCount?: number;
}

export default function ContextSwitcher({
  companyRole,
  buyerPendingCount = 0,
  sellerPendingCount = 0,
}: ContextSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<ContextMode>('buyer');

  // Only show for dual-role companies
  if (companyRole !== 'both') return null;

  // Load saved context from cookie
  useEffect(() => {
    const saved = document.cookie
      .split('; ')
      .find((row) => row.startsWith('warrantee_context='))
      ?.split('=')[1] as ContextMode | undefined;
    if (saved === 'buyer' || saved === 'seller') {
      setMode(saved);
    }
  }, []);

  const switchContext = useCallback(
    (newMode: ContextMode) => {
      if (newMode === mode) return;
      setMode(newMode);
      // Save to cookie (expires in 365 days)
      document.cookie = `warrantee_context=${newMode};path=/;max-age=31536000;SameSite=Lax`;
      // Refresh current page to reload data in new context
      router.refresh();
    },
    [mode, router]
  );

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-full p-1 gap-0.5">
      {/* Buyer Toggle */}
      <button
        onClick={() => switchContext('buyer')}
        className={`relative flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
          mode === 'buyer'
            ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        aria-pressed={mode === 'buyer'}
      >
        <span>🏢</span>
        <span>As Buyer</span>
        {mode !== 'buyer' && buyerPendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Seller Toggle */}
      <button
        onClick={() => switchContext('seller')}
        className={`relative flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300 ${
          mode === 'seller'
            ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow-sm'
            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
        }`}
        aria-pressed={mode === 'seller'}
      >
        <span>🏭</span>
        <span>As Seller</span>
        {mode !== 'seller' && sellerPendingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-pulse" />
        )}
      </button>
    </div>
  );
}

// Hook to read the current context mode from cookies (server-compatible)
export function useContextMode(): ContextMode {
  const [mode, setMode] = useState<ContextMode>('buyer');

  useEffect(() => {
    const saved = document.cookie
      .split('; ')
      .find((row) => row.startsWith('warrantee_context='))
      ?.split('=')[1] as ContextMode | undefined;
    if (saved === 'buyer' || saved === 'seller') {
      setMode(saved);
    }
  }, []);

  return mode;
}
