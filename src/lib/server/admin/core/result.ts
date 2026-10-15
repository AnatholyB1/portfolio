export type CoreResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; message: string };
