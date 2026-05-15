'use client';

import { useState, useEffect } from 'react';

interface CinemaIntroProps {
  onDone?: () => void;
  force?: boolean;
}

export default function CinemaIntro({ onDone, force = false }: CinemaIntroProps) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('ba_intro_seen');
    if (seen === '1' && !force) {
      setGone(true);
      onDone?.();
      return;
    }
    const t = setTimeout(() => {
      setGone(true);
      localStorage.setItem('ba_intro_seen', '1');
      onDone?.();
    }, 1700);
    return () => clearTimeout(t);
  }, [force]);

  return (
    <div className={`intro${gone ? ' gone' : ''}`}>
      <div className="intro-mark" />
      <div className="intro-label">BRICON·ANATHOLY.</div>
      <div className="intro-progress" />
    </div>
  );
}
