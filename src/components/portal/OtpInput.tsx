'use client';

import { useId, useState } from 'react';
import { OTP_LENGTH } from '@/lib/auth/schemas';

interface OtpInputProps {
  name?: string;
  invalid?: boolean;
  describedBy?: string;
  /** Vérification en cours : l'input reste monté et focalisé (lecture seule), jamais démonté. */
  pending?: boolean;
}

const GROUP = OTP_LENGTH / 2;

// UN seul vrai input (collage et saisie automatique iOS/Android fonctionnent) posé
// sur OTP_LENGTH cellules visuelles, groupées par moitié. Chiffres en --ink, jamais en accent.
export default function OtpInput({
  name = 'code',
  invalid = false,
  describedBy,
  pending = false,
}: OtpInputProps) {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputId = useId();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (pending) return;
    const digits = e.currentTarget.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    e.currentTarget.value = digits;
    setValue(digits);
    if (digits.length === OTP_LENGTH) e.currentTarget.form?.requestSubmit();
  }

  const activeIndex = Math.min(value.length, OTP_LENGTH - 1);

  return (
    <div className="pt-field">
      <label className="pt-label" htmlFor={inputId}>
        {`Code à ${OTP_LENGTH} chiffres`}
      </label>
      <div className="pt-otp" data-pending={pending ? '' : undefined}>
        {Array.from({ length: OTP_LENGTH }, (_, i) => (
          <span
            key={i}
            className="pt-otp-cell"
            aria-hidden="true"
            data-active={focused && i === activeIndex ? '' : undefined}
            data-group-end={(i + 1) % GROUP === 0 && i < OTP_LENGTH - 1 ? '' : undefined}
          >
            {value[i] ?? ''}
          </span>
        ))}
        <input
          id={inputId}
          className="pt-otp-input"
          name={name}
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={OTP_LENGTH}
          pattern={`[0-9]{${OTP_LENGTH}}`}
          readOnly={pending}
          aria-busy={pending ? 'true' : undefined}
          aria-invalid={invalid ? 'true' : undefined}
          aria-describedby={describedBy}
          autoFocus
          required
        />
      </div>
    </div>
  );
}
