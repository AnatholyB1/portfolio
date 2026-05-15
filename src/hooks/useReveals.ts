import { useEffect } from 'react';

export function useReveals(deps: unknown[] = []) {
  useEffect(() => {
    // Respect reduced motion: reveal all immediately, skip observer setup
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        el.classList.add('in');
      });
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const delay = (e.target as HTMLElement).dataset.revealDelay;
            if (delay) (e.target as HTMLElement).style.transitionDelay = delay;
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -50px 0px' }
    );

    const observed = new WeakSet<Element>();
    const sweep = () => {
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        if (!observed.has(el)) {
          observed.add(el);
          io.observe(el);
        }
      });
    };

    sweep();

    const mo = new MutationObserver(() => sweep());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      io.disconnect();
      mo.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
