'use client';

import { useId, useState, type Ref } from 'react';
import { OTP_LENGTH } from '@/lib/auth/schemas';

interface OtpInputProps {
  name?: string;
  /** Nombre de chiffres : OTP_LENGTH pour la connexion, une valeur propre pour la signature. */
  length?: number;
  /** Libellé du champ. Par défaut : « Code à N chiffres ». */
  label?: string;
  invalid?: boolean;
  describedBy?: string;
  /** Vérification en cours : l'input reste monté et focalisé (lecture seule), jamais démonté. */
  pending?: boolean;
  /** Code définitivement inutilisable (expiré, trop d'essais) : champ inactif. */
  disabled?: boolean;
  /** Envoie le formulaire dès que le code est complet (connexion). Faux pour un acte de signature. */
  autoSubmit?: boolean;
  /** Mode contrôlé : le parent possède la valeur (ex. pour la vider après une erreur). */
  value?: string;
  onValueChange?: (value: string) => void;
  inputRef?: Ref<HTMLInputElement>;
}

// UN seul vrai input (collage et saisie automatique iOS/Android fonctionnent) posé
// sur `length` cellules visuelles, groupées par moitié. Chiffres en --ink, jamais en accent.
// Partagé par la connexion et la signature : même comportement, même focus, sans décalage de mise en page.
export default function OtpInput({
  name = 'code',
  length = OTP_LENGTH,
  label,
  invalid = false,
  describedBy,
  pending = false,
  disabled = false,
  autoSubmit = true,
  value: controlled,
  onValueChange,
  inputRef,
}: OtpInputProps) {
  const [inner, setInner] = useState('');
  const [focused, setFocused] = useState(false);
  const inputId = useId();
  const value = controlled ?? inner;
  const group = length / 2;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (pending) return;
    const digits = e.currentTarget.value.replace(/\D/g, '').slice(0, length);
    e.currentTarget.value = digits;
    setInner(digits);
    onValueChange?.(digits);
    if (autoSubmit && digits.length === length) e.currentTarget.form?.requestSubmit();
  }

  const activeIndex = Math.min(value.length, length - 1);

  return (
    <div className="pt-field">
      <label className="pt-label" htmlFor={inputId}>
        {label ?? `Code à ${length} chiffres`}
      </label>
      <div className="pt-otp" data-pending={pending ? '' : undefined}>
        {Array.from({ length }, (_, i) => (
          <span
            key={i}
            className="pt-otp-cell"
            aria-hidden="true"
            data-active={focused && i === activeIndex ? '' : undefined}
            data-group-end={(i + 1) % group === 0 && i < length - 1 ? '' : undefined}
          >
            {value[i] ?? ''}
          </span>
        ))}
        <input
          id={inputId}
          ref={inputRef}
          className="pt-otp-input"
          name={name}
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          spellCheck={false}
          maxLength={length}
          pattern={`[0-9]{${length}}`}
          readOnly={pending}
          disabled={disabled}
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
