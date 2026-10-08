'use client';

import { useRef } from 'react';
import { Star } from 'lucide-react';

interface ReviewRatingInputProps {
  value: number | null;
  onChange: (n: number) => void;
  invalid?: boolean;
  describedBy?: string;
}

const VALUES = [1, 2, 3, 4, 5];

export default function ReviewRatingInput({ value, onChange, invalid, describedBy }: ReviewRatingInputProps) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function move(n: number) {
    const next = Math.min(5, Math.max(1, n));
    onChange(next);
    refs.current[next - 1]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        move(value === null ? 1 : value + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        move(value === null ? 1 : value - 1);
        break;
      case 'Home':
        e.preventDefault();
        move(1);
        break;
      case 'End':
        e.preventDefault();
        move(5);
        break;
    }
  }

  // Roving tabindex : sans valeur, seule la première note est atteignable au clavier.
  const tabTarget = value ?? 1;

  return (
    <div className="rv-rating-row">
      <div
        role="radiogroup"
        aria-label="Note de 1 à 5"
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        className="rv-rating"
      >
        {VALUES.map((n) => {
          const filled = value !== null && n <= value;
          return (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={value === n}
              aria-label={`${n} sur 5`}
              tabIndex={n === tabTarget ? 0 : -1}
              ref={(el) => {
                refs.current[n - 1] = el;
              }}
              className="rv-star"
              onClick={() => onChange(n)}
              onKeyDown={onKeyDown}
            >
              <Star
                size={24}
                aria-hidden="true"
                fill={filled ? 'var(--acid)' : 'none'}
                stroke={filled ? 'var(--acid)' : 'var(--pt-border-strong)'}
              />
            </button>
          );
        })}
      </div>
      <span className="pt-helper" aria-hidden="true">
        {value === null ? '' : `${value} sur 5`}
      </span>
    </div>
  );
}
