'use client';

import { useState, useEffect } from 'react';
import SevalysMark from '@/components/ui/SevalysMark';

interface CinemaIntroProps {
  onDone?: () => void;
  force?: boolean;
}

export default function CinemaIntro({ onDone, force = false }: CinemaIntroProps) {
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('sv_intro_seen');
    if (seen === '1' && !force) {
      setGone(true);
      onDone?.();
      return;
    }
    const t = setTimeout(() => {
      setGone(true);
      localStorage.setItem('sv_intro_seen', '1');
      onDone?.();
    }, 1700);
    return () => clearTimeout(t);
  }, [force]);

  return (
    <div className={`intro${gone ? ' gone' : ''}`}>
      <div className="intro-mark">
        <SevalysMark size="60%" title="Sèvalys" />
      </div>
      <div className="intro-label">SÈVALYS.</div>
      <div className="intro-progress" />
    </div>
  );
}
