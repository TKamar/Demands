import { useState, useEffect } from 'react';

/**
 * Returns true only after `loading` has been true for `delay` ms.
 * Prevents flickering on fast fetches.
 */
export function useDelayedLoading(loading: boolean, delay = 150): boolean {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setShow(false);
      return;
    }
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [loading, delay]);

  return show;
}
