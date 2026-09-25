import { useEffect, useRef, useState } from 'react';

/**
 * Eases a number towards `target` on the JS thread. Used for count-up numbers
 * and SVG ring/bar progress so the same code animates on iOS, Android and web.
 */
export function useAnimatedNumber(target: number, duration = 900, delay = 0): number {
  const [value, setValue] = useState(0);
  const current = useRef(0);

  useEffect(() => {
    const from = current.current;
    const start = Date.now() + delay;
    let raf = 0;
    const tick = () => {
      const t = Math.min(1, Math.max(0, (Date.now() - start) / duration));
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from + (target - from) * eased;
      current.current = v;
      setValue(v);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, delay]);

  return value;
}
