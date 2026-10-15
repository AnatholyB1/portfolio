/** a***@d***.fr : 1re lettre du local-part et du domaine + suffixe. Ne lève jamais, ne renvoie jamais l'entrée. */
export function maskEmail(email: unknown): string {
  if (typeof email !== 'string') return '***';
  const value = email.trim();
  const at = value.indexOf('@');
  if (at < 1 || at !== value.lastIndexOf('@')) return '***';
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  const dot = domain.indexOf('.');
  const name = dot === -1 ? domain : domain.slice(0, dot);
  if (!name) return '***';
  const suffix = dot === -1 ? '' : domain.slice(dot);
  return `${Array.from(local)[0]}***@${Array.from(name)[0]}***${suffix}`;
}

/** ***78 : seuls les deux derniers chiffres. Ne lève jamais, ne renvoie jamais l'entrée. */
export function maskPhone(phone: unknown): string {
  if (typeof phone !== 'string') return '***';
  const digits = phone.replace(/\D/g, '');
  return digits.length < 4 ? '***' : `***${digits.slice(-2)}`;
}
