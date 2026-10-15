/** Plafond d'un PDF renvoyé dans une réponse d'outil (base64). Au-delà, passer par une URL signée. */
export const MAX_PDF_BASE64_CHARS = 2_000_000;

export function pdfTooLarge(base64: string): boolean {
  return base64.length > MAX_PDF_BASE64_CHARS;
}

/** Message de refus ; `urlTool` est l'outil d'URL signée qui sert le document une fois émis. */
export function pdfTooLargeMessage(urlTool: string): string {
  return `Le PDF dépasse 2 Mo (base64) : il n'est pas renvoyé dans la réponse. Utilisez ${urlTool} (URL signée) après l'émission.`;
}
