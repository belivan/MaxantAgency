'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile viewport
 * Uses the 'md' breakpoint (768px) from Tailwind
 * Returns true on mobile (<768px), false on desktop
 */
export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check initial viewport size
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Set initial value
    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  return isMobile;
}
