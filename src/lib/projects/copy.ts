// Textes français des surfaces projet (portail et admin). Aucun prix (D-22).
// Module sûr côté client. Les textes d'étapes vivent dans steps.ts.
export const PROJECT_COPY = {
  errors: {
    generic: "L'enregistrement n'a pas abouti. Vérifiez votre connexion puis réessayez.",
    required: 'Ce champ est obligatoire.',
    vatFormat:
      'Ce numéro de TVA semble incorrect. Exemple : FR12345678901. Si vous n\'êtes pas assujetti, cochez « Non assujetti ».',
    url: 'Saisissez une adresse complète commençant par https://',
    fileTooLarge: 'Ce fichier dépasse 25 Mo. Compressez-le ou envoyez-le en plusieurs parties.',
    fileType:
      "Ce type de fichier n'est pas accepté. Formats possibles : PDF, images, documents Office, zip, SVG, AI, EPS.",
    uploadFailed: (name: string) =>
      `L'envoi de ${name} a échoué. Réessayez ; si cela continue, écrivez à contact@sevalys.com.`,
    downloadFailed: "Le lien de téléchargement n'a pas pu être créé. Réessayez dans un instant.",
    consentStale:
      'Le texte a été mis à jour. Rechargez la page pour le relire avant de confirmer.',
  },
  conversion: {
    emailTaken: 'Cette adresse e-mail est déjà utilisée par un compte. Utilisez une autre adresse pour ce client.',
    alreadyConverted: 'Ce lead est déjà converti en client.',
    statusNotAllowed: 'Seuls les leads à partir de « Qualifié » peuvent être convertis.',
    existingSiret:
      'Ce SIRET correspond à un client existant. Il sera réutilisé et un nouveau projet y sera ajouté.',
    notYetConvertible: 'Convertible à partir de « Qualifié ».',
    reopenFirst: "Rouvrez d'abord le lead pour le convertir.",
    trigger: 'Convertir en client',
    title: 'Convertir en client',
    helper: "Cela crée le client, son premier projet et envoie l'invitation à son espace.",
    submit: "Convertir et envoyer l'invitation",
    submitting: 'Conversion en cours…',
    cancel: 'Annuler',
    converted: 'Client converti',
    viewProject: 'Voir le projet',
    success: (email: string) => `Client créé. Invitation envoyée à ${email}.`,
    mailFailed:
      "Client créé, mais l'invitation n'a pas pu partir. Elle sera retentée automatiquement ; vous pouvez aussi la renvoyer depuis la liste des clients.",
  },
  facts: {
    alreadyRecorded: 'Ce fait est déjà enregistré. Rien n\'a été modifié.',
    recorded: (stepName: string) => `Fait enregistré. L'étape est maintenant ${stepName}.`,
    ahead: "Ce fait est en avance : l'étape ne changera qu'une fois les faits précédents enregistrés.",
    submit: 'Enregistrer le fait',
    emptyJournal: 'Aucun fait enregistré pour ce projet.',
    revokeTitle: 'Annuler ce fait',
    revokeBody: (fact: string) =>
      `Le fait « ${fact} » sera marqué comme annulé et l'étape sera recalculée. Il reste visible dans l'historique. Indiquez le motif (10 à 500 caractères).`,
    revokeConfirm: "Confirmer l'annulation",
    revokeKeep: 'Garder ce fait',
    revoked: 'Annulé',
    mailSent: 'E-mail envoyé au client',
    mailPending: "E-mail en attente d'envoi",
    mailFailed: "Échec de l'envoi, il sera retenté",
  },
  blocage: {
    client: 'Attend le client',
    admin: 'Attend Sèvalys',
    dormant: (n: number) => `Dormant (${n} j sans activité)`,
    done: 'Terminé',
  },
  whoWaits: {
    client: 'vous',
    admin: 'Sèvalys',
    done: 'Rien, votre projet est livré',
    label: 'En attente de',
    since: (n: number) => `Depuis ${n} ${n > 1 ? 'jours' : 'jour'}`,
    cta: 'Compléter mes informations',
  },
  portal: {
    emptyHeading: "Votre projet n'est pas encore ouvert",
    emptyBody:
      "Sèvalys prépare votre projet. Vous recevrez un e-mail dès qu'il apparaîtra ici. Une question ? contact@sevalys.com",
    timelineLabel: 'Avancement du projet',
    current: 'En cours',
    doneSuffix: ', terminée',
    currentSuffix: ', étape en cours',
    upcomingSuffix: ', à venir',
    startedOn: (date: string) => `Démarré le ${date}`,
    projectSelect: 'Projet',
  },
  onboarding: {
    heading: 'Vos informations',
    helper:
      "Elles servent à préparer vos devis et contrats. Vos réponses sont enregistrées au fil de l'eau.",
    progress: (n: number) => `${n} ${n > 1 ? 'blocs' : 'bloc'} sur 5 ${n > 1 ? 'complétés' : 'complété'}`,
    complete: 'Complet',
    todo: 'À compléter',
    confirmCompany: 'Confirmer les informations de ma société',
    confirmedOn: (date: string) => `Confirmé le ${date}`,
    reportError: 'Signaler une erreur',
    done: 'Merci, votre onboarding est complet. Nous préparons votre devis.',
    edit: 'Modifier mes informations',
    saving: 'Enregistrement…',
    savedAt: (time: string) => `Enregistré à ${time}`,
    optionalHelper: "Laissez vide si c'est le signataire.",
  },
  files: {
    heading: 'Fichiers du projet',
    add: 'Ajouter un fichier',
    helper:
      '25 Mo maximum par fichier. PDF, images, documents Office, archives zip et logos vectoriels (SVG, AI, EPS).',
    empty:
      'Aucun fichier pour l\'instant. Ajoutez votre logo, vos photos ou tout document utile au projet.',
    uploading: 'Envoi en cours…',
    added: (name: string) => `${name} ajouté`,
    retry: 'Réessayer',
    cancel: 'Annuler',
    download: 'Télécharger',
    preparing: 'Préparation…',
    byClient: 'Vous',
    byAdmin: 'Sèvalys',
  },
  links: {
    heading: 'Liens utiles',
    newTab: ' (nouvel onglet)',
    add: 'Ajouter le lien',
  },
  consent: {
    heading: 'Présentation de votre projet',
    intro:
      "Vous décidez si Sèvalys peut montrer ce projet. C'est facultatif et sans effet sur votre projet.",
    version: (v: string) => `Version ${v}`,
    checkbox: "J'ai lu le texte ci-dessus et j'accepte.",
    save: 'Enregistrer mon accord',
    granted: (date: string) => `Accord donné le ${date}.`,
    withdraw: 'Retirer mon accord',
    withdrawn: (date: string) => `Accord retiré le ${date}. Vous pouvez le redonner à tout moment.`,
    reload: 'Recharger la page',
  },
  admin: {
    emptyHeading: 'Aucun projet pour l\'instant',
    emptyBody:
      "Un projet est créé quand vous convertissez un lead qualifié en client. Ouvrez la liste des leads pour commencer.",
    goToLeads: 'Aller aux leads',
    noMatch: 'Aucun projet ne correspond à ces filtres.',
    resetFilters: 'Réinitialiser les filtres',
    navLabel: 'Projets',
  },
  // Phase 13 : documents. Aucun prix ici, les libellés de prix vivent dans documents/types.ts.
  documents: {
    nav: {
      project: 'Projet',
      documents: 'Documents',
      payments: 'Paiements (bientôt)',
    },
    portal: {
      title: 'Documents',
      emptyHeading: 'Aucun document pour le moment',
      emptyBody:
        "Votre devis, votre contrat et vos autres documents apparaîtront ici dès qu'ils seront émis. Vous recevrez un e-mail à chaque nouveau document.",
      caption: (title: string) => `Documents du projet ${title}`,
      columns: {
        document: 'Document',
        issuedOn: 'Émis le',
        version: 'Version',
        status: 'Statut',
        action: 'Action',
      },
      version: (n: number) => `Version ${n}`,
      replacedBy: (n: number, date: string) => `Remplacé par la version ${n} du ${date}`,
      download: 'Télécharger',
      preparing: 'Préparation…',
      statusUnavailable: 'Statut indisponible',
      downloadFailed:
        "Le téléchargement n'a pas pu démarrer. Réessayez dans un instant ; si le problème continue, écrivez-nous.",
    },
    admin: {
      title: 'Documents',
      noExpected: 'Aucun document attendu à cette étape.',
      noIssued: 'Aucun document émis pour ce projet.',
      toIssue: 'À émettre',
      issuedVersion: (n: number) => `Émis, version ${n}`,
      generate: 'Générer',
      replace: 'Remplacer',
      preview: 'Aperçu',
      previewing: "Génération de l'aperçu…",
      issue: 'Émettre le document',
      issueHelper:
        "Vérifiez l'aperçu. Une fois émis, le document ne peut plus être modifié, seulement remplacé.",
      previewBanner: "Aperçu non conservé. Ce fichier n'est pas celui qui sera émis.",
      openPreview: "Ouvrir l'aperçu dans un nouvel onglet",
      confirmTitle: (label: string) => `Émettre ${label} ?`,
      confirmBody:
        'Le document sera figé, visible par le client dans son espace, et un e-mail lui sera envoyé.',
      confirmReplace: (n: number) => `Il remplacera la version ${n}, qui restera consultable.`,
      confirm: "Confirmer l'émission",
      issuing: 'Émission en cours…',
      cancel: 'Annuler',
      success: 'Document émis. Le client a été notifié par e-mail.',
      alreadyIssued: 'Ce document est déjà émis.',
      mailFailed:
        "Document émis. L'e-mail n'a pas pu partir immédiatement, il sera renvoyé automatiquement.",
      validationSummary: 'Corrigez les champs indiqués puis relancez l\'aperçu.',
      needQuote: "Émettez d'abord le devis.",
      needSpec: "Émettez d'abord le cahier des charges.",
      wrongStep: "Ce document ne peut pas être émis à l'étape actuelle.",
      signedNoReplace:
        'Ce document est signé et figé. Pour corriger, ajoutez un fait correctif depuis le journal des faits.',
      concurrent:
        "Un autre document vient d'être émis entre-temps. Rechargez la page puis relancez l'aperçu.",
      sellerNotConfigured:
        "L'identité du vendeur n'est pas encore renseignée. L'émission reste bloquée jusqu'à sa saisie.",
      issueFailed:
        "Le document n'a pas pu être émis. Rien n'a été envoyé au client. Réessayez ; si l'erreur persiste, contactez le support technique.",
      previewFailed: "L'aperçu n'a pas pu être généré. Vérifiez les champs puis réessayez.",
      invoiceTitle: 'Facture (aperçu uniquement)',
      invoiceHelper:
        "L'émission des factures arrive avec le module de paiement. L'aperçu porte la mention PROFORMA et n'est pas conservé.",
      contractHelper: 'Les clauses sont fixes. Les montants viennent du devis émis.',
      specGoalHelper: 'Prérempli depuis le questionnaire du client',
      specCriteriaHelper:
        'Un critère par ligne. Ils seront repris tels quels dans le PV de recette.',
      reservationsHelper: "Laissez vide s'il n'y a aucune réserve.",
      issuedCaption: 'Documents émis',
      columns: {
        model: 'Modèle',
        hash: 'Empreinte SHA-256',
        actions: 'Actions',
      },
      viewData: 'Voir les données',
      viewHash: "Voir l'empreinte",
      download: 'Télécharger',
    },
    snapshot: {
      title: "Données figées à l'émission",
      meta: (v: string, date: string, size: string) => `Modèle ${v} · émis le ${date} · ${size}`,
      copyHash: "Copier l'empreinte",
      copied: 'Copié',
      readOnly: 'Lecture seule. Pour corriger, émettez une nouvelle version.',
      raw: 'Données brutes (JSON)',
      verify: "Vérifier l'empreinte",
      verifyOk: "L'empreinte correspond au fichier stocké.",
      verifyKo:
        "L'empreinte ne correspond pas au fichier stocké. Ne diffusez pas ce document et prévenez le support technique.",
      verifyFailed: 'Vérification impossible pour le moment. Réessayez dans un instant.',
    },
  },
  // Phase 14 : signature électronique (portail, onglet Documents, admin). Aucun prix, aucun U+202F.
  // Les textes de consentement et mentions du certificat vivent dans src/lib/signature/consentText.ts.
  signature: {
    back: 'Retour aux documents',
    titles: {
      quote: 'Signer le devis',
      contract: 'Signer le contrat',
      acceptance: 'Signer le procès-verbal de recette',
      acceptanceChecklist: 'Recette du projet',
    },
    meta: (version: number, date: string) => `Version ${version} · émis le ${date}`,
    stepsLabel: 'Étapes de la signature',
    steps: {
      three: ['1. Lire', '2. Consentir', '3. Confirmer par code'],
      four: ['1. Vérifier les critères', '2. Lire', '3. Consentir', '4. Confirmer par code'],
    },
    read: {
      legend: 'Lire le document',
      iframeTitle: (type: string) => `Document à signer : ${type}`,
      openNewTab: 'Ouvrir le document dans un nouvel onglet',
      download: 'Télécharger le document',
      mobileNote:
        "Sur téléphone, l'affichage intégré peut être limité. Utilisez « Ouvrir le document » pour le lire en entier.",
      reference: (reference: string, hash12: string) => `Référence ${reference} · Empreinte ${hash12}`,
      viewerError:
        "Le document n'a pas pu s'afficher. Ouvrez-le dans un nouvel onglet ou réessayez dans un instant.",
      retry: 'Réessayer',
    },
    consent: {
      legend: 'Avant de signer',
      textVersion: (n: number) => `Texte v${n}`,
      signer: (name: string, role: string) => `Signataire : ${name}, ${role}`,
      signerNoRole: (name: string) => `Signataire : ${name}`,
      codeTarget: (maskedEmail: string) => `Le code sera envoyé à ${maskedEmail}`,
      helper: 'Cochez les deux cases pour recevoir le code.',
      receiveCode: 'Recevoir le code',
      sendingCode: 'Envoi du code…',
      recap: 'Consentements enregistrés',
    },
    mismatch: {
      title: "Vous n'êtes pas le signataire désigné",
      body: (name: string) =>
        `Ce document doit être signé par ${name}. Connectez-vous avec l'adresse e-mail du signataire, ou écrivez-nous pour modifier le signataire.`,
      logout: 'Se déconnecter',
      write: 'Écrire à Sèvalys',
    },
    code: {
      label: 'Code à 6 chiffres',
      sent: (maskedEmail: string) => `Code envoyé à ${maskedEmail}. Il est valable 10 minutes.`,
      wrong: (n: number) => `Ce code n'est pas correct. Il vous reste ${n} ${n > 1 ? 'essais' : 'essai'}.`,
      tooMany: "Trop d'essais. Ce code n'est plus valable. Demandez-en un nouveau.",
      expired: 'Ce code a expiré. Demandez-en un nouveau.',
      newCode: 'Recevoir un nouveau code',
      resend: 'Renvoyer le code',
      resendIn: (s: number) => `Renvoyer le code (${s} s)`,
      tooSoon: (s: number) => `Patientez ${s} s avant de demander un nouveau code.`,
      hourlyCap: 'Limite atteinte : 5 envois par heure. Réessayez plus tard ou écrivez-nous.',
      sendFailed:
        "Le code n'a pas pu être envoyé. Réessayez dans un instant ; si le problème continue, écrivez-nous.",
      beforeSign: (type: string) =>
        `En cliquant sur « Signer le document », vous signez ${type} et le document ne pourra plus être modifié.`,
      sign: 'Signer le document',
      signing: 'Signature en cours…',
      // Utilisé uniquement quand la vérification du code elle-même échoue : rien n'est enregistré.
      signFailed:
        "La signature n'a pas pu être finalisée. Aucune signature n'a été enregistrée. Réessayez ; si l'erreur persiste, écrivez-nous.",
      // Signature enregistrée mais scellement échoué (protocoles A/B/C) : la phrase précédente serait fausse.
      finalizePending:
        "Votre signature est enregistrée, mais le document signé n'a pas encore pu être finalisé. Réessayez dans un instant ; si l'erreur persiste, écrivez-nous.",
      finalizeAction: 'Reprendre la finalisation',
    },
    states: {
      replaced: (n: number) => `Cette version a été remplacée par la version ${n}.`,
      seeVersion: (n: number) => `Voir la version ${n}`,
      notSignable: "Ce document n'est pas encore à signer.",
    },
    success: {
      heading: 'Document signé',
      body: (date: string, time: string) =>
        `Merci. Votre signature a été enregistrée le ${date} à ${time} (heure de Paris).`,
      reference: (reference: string) => `Référence ${reference}`,
      sealedHash: (hash12: string) => `Empreinte du document scellé ${hash12}`,
      download: 'Télécharger le document signé',
      preparing: 'Préparation…',
      downloadFailed:
        "Le téléchargement n'a pas pu démarrer. Réessayez dans un instant ; si le problème continue, écrivez-nous.",
      emailSent: 'Un e-mail de confirmation vous a été envoyé.',
    },
    checklist: {
      intro:
        "Pour chaque critère, indiquez s'il est livré. Vous pouvez signaler une réserve ou refuser un critère.",
      criterionLegend: (n: number, text: string) => `Critère ${n} : ${text}`,
      delivered: 'Livré',
      reserve: 'Livré avec réserve',
      refused: 'Non livré (refus)',
      reserveLabel: 'Décrivez la réserve',
      refusedLabel: "Pourquoi ce critère n'est-il pas livré ?",
      counter: (n: number) => `${n} / 1000`,
      refusedHelper:
        'Un critère refusé empêche la signature. Sèvalys est prévenu et vous enverra un procès-verbal corrigé.',
      summary: (validated: number, total: number, reserves: number, refusals: number) =>
        `${validated} sur ${total} critères validés · ${reserves} ${reserves > 1 ? 'réserves' : 'réserve'} · ${refusals} refus`,
      reservesNote: 'Vos réserves seront inscrites au procès-verbal signé. La signature reste possible.',
      remaining: (n: number) => `Répondez à chacun des ${n} critères restants.`,
      continue: 'Continuer vers la signature',
      sendFeedback: 'Envoyer mon retour à Sèvalys',
      feedbackSent:
        'Retour envoyé. Sèvalys a été prévenu et vous enverra un procès-verbal corrigé. Aucune signature n\'a été enregistrée.',
      feedbackFailed:
        "Votre retour n'a pas pu être envoyé. Réessayez ; si l'erreur persiste, écrivez-nous.",
      recap: (validated: number, reserves: number) =>
        `Vos réponses : ${validated} validés, ${reserves} ${reserves > 1 ? 'réserves' : 'réserve'}`,
      editAnswers: 'Modifier mes réponses',
    },
    documentsTab: {
      readAndSign: 'Lire et signer',
      downloadSigned: 'Télécharger le document signé',
      signedOn: (date: string) => `Signé le ${date}`,
      awaiting: 'Un document attend votre signature.',
      goToDocuments: 'Aller aux documents',
    },
    admin: {
      signedBy: (name: string, date: string, ip: string) => `Signé par ${name} le ${date} · IP ${ip}`,
      manualFactNotice:
        'Ce fait a déjà été posé par une signature électronique. Toute correction manuelle est journalisée.',
      pvRefusal: (n: number) =>
        `Le client a refusé ${n} ${n > 1 ? 'critères' : 'critère'}. Émettez un procès-verbal corrigé.`,
      block: {
        title: 'Signature',
        signer: 'Signataire',
        signedAt: 'Signé le',
        ip: 'IP',
        templateVersion: 'Version du modèle',
        consentVersion: 'Texte de consentement',
        originalHash: "Empreinte de l'original",
        sealedHash: 'Empreinte du document scellé',
        lastLinkHash: 'Empreinte du dernier maillon',
        reserves: 'Réserves',
        copy: 'Copier',
      },
      exportTrail: "Exporter la piste d'audit",
      exporting: "Préparation de l'export…",
      exportFailed:
        "L'export n'a pas pu être généré. Réessayez ; si l'erreur persiste, contactez le support technique.",
      verify: "Vérifier l'intégrité",
      verifying: 'Vérification en cours…',
      integrityOk: (n: number, date: string, time: string) =>
        `Piste intègre : ${n} ${n > 1 ? 'maillons vérifiés' : 'maillon vérifié'} le ${date} à ${time}.`,
      integrityBroken: (k: number) =>
        `Piste rompue au maillon ${k}. Ne diffusez pas ce document et prévenez le support technique.`,
      integrityFailure: "La vérification n'a pas pu être exécutée. Réessayez dans un instant.",
      downloadOriginal: "Télécharger l'original",
      downloadSealed: 'Télécharger le document scellé',
      trailSummary: (n: number) => `Journal de la piste (${n} ${n > 1 ? 'événements' : 'événement'})`,
      trailEmpty: 'Aucun événement enregistré pour ce document.',
      trailColumns: { date: 'Date', event: 'Événement', actor: 'Acteur', ip: 'IP' },
      actions: {
        document_opened: 'Document ouvert',
        acceptance_response: 'Réponse au critère',
        acceptance_refused: 'Recette refusée',
        consent_given: 'Consentement enregistré',
        code_sent: 'Code envoyé',
        code_send_failed: "Échec d'envoi du code",
        code_failed: 'Code incorrect',
        code_locked: "Code bloqué (trop d'essais)",
        code_expired: 'Code expiré',
        signed: 'Document signé',
        sealed: 'Document scellé',
        seal_downloaded: 'Document scellé téléchargé',
      },
    },
  },
} as const;
