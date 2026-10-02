'use client';

import { useState } from 'react';
import { OTP_LENGTH } from '@/lib/auth/schemas';

interface OtpInputProps {
  name?: string;
  invalid?: boolean;
  describedBy?: string;
}

// UN seul vrai input (collage et saisie automatique iOS/Android fonctionnent) posé
// sur OTP_LENGTH cellules visuelles. Chiffres en --ink, jamais en accent.
export default function OtpInput({ name = 'code', invalid = false, describedBy }: OtpInputProps) {
  const [value, setValue] = useState('');

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.currentTarget.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    e.currentTarget.value = digits;
    setValue(digits);
    if (digits.length === OTP_LENGTH) e.currentTarget.form?.requestSubmit();
  }

  return (
    <div
      className="pt-otp"
      style={{ ['--pt-otp-length' as string]: OTP_LENGTH }}
    >
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <span key={i} className="pt-otp-cell" aria-hidden="true">
          {value[i] ?? ''}
        </span>
      ))}
      <input
        className="pt-otp-input"
        name={name}
        value={value}
        onChange={handleChange}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        pattern={`[0-9]{${OTP_LENGTH}}`}
        aria-label={`Code à ${OTP_LENGTH} chiffres`}
        aria-invalid={invalid ? 'true' : undefined}
        aria-describedby={describedBy}
        autoFocus
        required
      />
    </div>
  );
}
