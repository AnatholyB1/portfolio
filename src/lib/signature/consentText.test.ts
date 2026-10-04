import { describe, expect, it } from 'vitest';
import { CERTIFICATE_MENTIONS, CONSENT_TEXTS, CONSENT_VERSION, PROOF_CLAUSE } from './consentText';

describe('consentText', () => {
  it('version v1', () => {
    expect(CONSENT_VERSION).toBe('v1');
  });

  it('textes de consentement verbatim', () => {
    expect(CONSENT_TEXTS.v1.esign).toBe(
      "J'accepte de signer ce document par voie électronique, au moyen d'un code à usage unique envoyé à mon adresse e-mail. Je reconnais que cette signature vaut mon accord au contenu du document.",
    );
    expect(CONSENT_TEXTS.v1.evidence).toBe(
      "J'accepte que les éléments techniques collectés lors de la signature (date et heure, adresse IP, empreinte du document, journal des actions) soient conservés et puissent être produits comme preuve de ma signature.",
    );
  });

  it('clause de preuve complète', () => {
    const { title, body } = PROOF_CLAUSE.v1;
    expect(title.length).toBeGreaterThan(0);
    expect(body).toContain('signature électronique simple');
    expect(body).toContain('code à usage unique');
    expect(body).toContain('piste d');
    expect(body).toContain('preuve');
    expect(body).toContain('ne contre-signe pas');
  });

  it('mentions du certificat', () => {
    expect(CERTIFICATE_MENTIONS.v1).toContain(
      'Sèvalys ne contre-signe pas ce document : son émission vaut engagement du vendeur.',
    );
  });

  it('aucun U+202F', () => {
    const all = JSON.stringify([CONSENT_TEXTS, PROOF_CLAUSE, CERTIFICATE_MENTIONS]);
    expect(all).not.toContain(' ');
  });
});
