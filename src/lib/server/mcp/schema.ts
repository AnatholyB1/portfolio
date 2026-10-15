import { z } from 'zod';

/** Chaîne rognée de min à max caractères (défaut : non vide), pour les entrées d'outil. */
export const t = (max: number, min = 1) => z.string().trim().min(min).max(max);
