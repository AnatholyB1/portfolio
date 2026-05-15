'use client';

import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia('(max-width: 900px)').matches) return;

    let mx = 0, my = 0, rx = 0, ry = 0, dx = 0, dy = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      dx = mx;
      dy = my;
    };

    const onOver = (e: MouseEvent) => {
      const target = (e.target as Element).closest('a, button, [data-hover]');
      if (target) {
        dotRef.current?.classList.add('hover');
        ringRef.current?.classList.add('hover');
      } else {
        dotRef.current?.classList.remove('hover');
        ringRef.current?.classList.remove('hover');
      }
    };

    window.addEventListener('mousemove', onMove);
    document.addEventListener('mouseover', onOver);

    let raf: number;
    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (dotRef.current)  dotRef.current.style.transform  = `translate(${dx}px, ${dy}px)`;
      if (ringRef.current) ringRef.current.style.transform = `translate(${rx}px, ${ry}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div ref={dotRef}  className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" />
    </>
  );
}
