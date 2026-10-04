// Textes provisoires : relecture juridique en attente (STATE blocker). Toute modification = nouvelle version, jamais d'édition d'une version existante.
// Module pur, sûr côté client. Aucun U+202F dans les chaînes (absent du sous-ensemble de police embarqué).

export const CONSENT_VERSION = 'v1' as const;

export const CONSENT_TEXTS: Record<'v1', { esign: string; evidence: string }> = {
  v1: {
    esign:
      "J'accepte de signer ce document par voie électronique, au moyen d'un code à usage unique envoyé à mon adresse e-mail. Je reconnais que cette signature vaut mon accord au contenu du document.",
    evidence:
      "J'accepte que les éléments techniques collectés lors de la signature (date et heure, adresse IP, empreinte du document, journal des actions) soient conservés et puissent être produits comme preuve de ma signature.",
  },
};

/** Clause de convention de preuve insérée dans le contrat v2. */
export const PROOF_CLAUSE: Record<'v1', { title: string; body: string }> = {
  v1: {
    title: 'Signature électronique et convention de preuve',
    body:
      "Les parties conviennent que les documents du projet peuvent être signés par signature électronique simple, au moyen d'un code à usage unique envoyé à l'adresse e-mail de la session du signataire. " +
      "Une piste d'audit (date et heure, adresse IP, empreinte du document, journal des actions) est conservée et peut être produite comme preuve ; les parties reconnaissent sa recevabilité à titre de preuve. " +
      "Sèvalys ne contre-signe pas les documents : leur émission vaut engagement du vendeur.",
  },
};

export const CERTIFICATE_MENTIONS: Record<'v1', readonly string[]> = {
  v1: [
    "Signature électronique simple, ni avancée ni qualifiée, réalisée par code à usage unique.",
    "Le signataire a accepté la convention de preuve (texte de consentement v1).",
    'Sèvalys ne contre-signe pas ce document : son émission vaut engagement du vendeur.',
  ],
};

export const CERTIFICATE_METHOD = 'Code à usage unique envoyé par e-mail';
