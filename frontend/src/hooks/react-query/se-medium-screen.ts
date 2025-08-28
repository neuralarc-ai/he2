// Create a new file: src/hooks/use-medium-screen.ts
import { useEffect, useState } from 'react';

export function useMediumScreen() {
  const [isMediumScreen, setIsMediumScreen] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const mediaQuery = window.matchMedia('(min-width: 768px) and (max-width: 1024px)');
      setIsMediumScreen(mediaQuery.matches);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  return isMediumScreen;
}