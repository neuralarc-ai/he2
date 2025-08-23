import { useEffect, useState } from 'react';

export function useCustomBreakpoint() {
  const [isCustomBreakpoint, setIsCustomBreakpoint] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const mediaQuery = window.matchMedia('(min-width: 1024px) and (max-width: 1227px)');
      setIsCustomBreakpoint(mediaQuery.matches);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  return isCustomBreakpoint;
}
