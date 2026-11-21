import { useEffect, useRef } from 'react';

type St = { sub?: number; bt?: number } | null;
const subOf = (s: unknown) => ((s ?? {}) as { sub?: number }).sub ?? 0;

/**
 * Lets the phone's back gesture (or the browser's Back) undo one step inside a page:
 * close a sheet, go from a chosen book back to the list… While `active`, there is an
 * extra history entry; going back removes it and calls `onBack`. Closing the step from
 * the page itself removes the entry too, so Back never needs an extra press.
 */
export function useBackStep(active: boolean, onBack: () => void) {
  const cb = useRef(onBack);
  cb.current = onBack;

  useEffect(() => {
    if (!active) return;
    const base = (history.state ?? {}) as NonNullable<St>;
    const mine = subOf(base) + 1;
    history.pushState({ ...base, sub: mine }, '', location.href);
    let popped = false;
    const onPop = (e: PopStateEvent) => {
      if (subOf(e.state) < mine) {
        popped = true;
        window.removeEventListener('popstate', onPop);
        cb.current();
      }
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (popped) return;
      // Closed from the page: drop our entry, unless the app has moved on to another page
      // (it then reuses our entry for the new page).
      setTimeout(() => {
        if (subOf(history.state) === mine) history.back();
      }, 0);
    };
  }, [active]);
}
