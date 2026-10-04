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
      payments: 'Paiements',
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
  // Phase 15 : paiements et facturation. Les montants et dates arrivent déjà formatés (chaînes) :
  // ce module ne formate jamais d'argent et ne contient aucun symbole monétaire.
  payments: {
    statuses: {
      to_pay: 'À payer',
      processing: 'Paiement en cours',
      paid: 'Payée',
      credited: 'Avoir',
      refunded: 'Remboursée',
    },
    kinds: {
      deposit: 'Acompte',
      period: 'Facture de période',
      final: 'Solde',
      credit_note: 'Avoir',
    },
    shortKinds: {
      deposit: 'Acompte',
      period: 'Période',
      final: 'Solde',
      credit_note: 'Avoir',
    },
    portal: {
      title: 'Paiements',
      toPayHeading: 'À régler',
      payDeposit: "Payer l'acompte",
      payInvoice: 'Payer la facture',
      payBalance: 'Payer le solde',
      pay: 'Payer',
      redirecting: 'Redirection vers Stripe…',
      secureNote: 'Paiement sécurisé par Stripe : carte bancaire ou virement.',
      depositHelper: "Le paiement de l'acompte lance la production de votre projet.",
      caption: (title: string) => `Factures du projet ${title}`,
      columns: {
        invoice: 'Facture',
        issuedOn: 'Émise le',
        period: 'Période',
        amount: 'Montant',
        status: 'Statut',
        action: 'Action',
      },
      period: (from: string, to: string) => `du ${from} au ${to}`,
      creditOf: (number: string) => `Avoir sur la facture ${number}`,
      creditLabel: (number: string) => `Avoir ${number}`,
      waiting: 'Nous attendons la confirmation de Stripe.',
      paidOn: (date: string) => `Payée le ${date}`,
      download: 'Télécharger',
      preparing: 'Préparation…',
      vatNote: 'TVA non applicable, art. 293 B du CGI : les montants affichés sont TTC.',
      testMode: 'Mode test : aucun paiement réel ne sera effectué.',
      emptyHeading: 'Aucune facture pour le moment',
      emptyBody:
        "Votre facture d'acompte apparaîtra ici dès la signature du contrat. Vous recevrez un e-mail à chaque nouvelle facture.",
      loadError:
        "Vos factures n'ont pas pu être chargées. Actualisez la page ; si le problème continue, écrivez-nous.",
      downloadFailed:
        "Le téléchargement n'a pas pu démarrer. Réessayez dans un instant ; si le problème continue, écrivez-nous.",
      payFailed:
        "Le paiement n'a pas pu démarrer. Aucun montant n'a été débité. Réessayez dans un instant ; si le problème continue, écrivez-nous.",
      alreadySettled: 'Cette facture est déjà réglée ou en cours de règlement.',
      partialCredit: (amount: string) => `Avoir partiel de ${amount}`,
    },
    returnBanner: {
      confirmingTitle: 'Paiement reçu, confirmation en cours',
      confirmingBody:
        'Stripe nous confirme votre paiement. Cela prend généralement quelques secondes. Cette page se met à jour automatiquement.',
      slowBody:
        "La confirmation prend plus de temps que prévu. Vous recevrez un e-mail dès qu'elle arrive.",
      confirmedTitle: 'Paiement confirmé',
      confirmedBody: (number: string) =>
        `Merci. La facture ${number} est réglée. Un reçu vous a été envoyé par e-mail.`,
      depositNext: "Votre projet passe à l'étape suivante : la production.",
      transferTitle: 'Virement en attente',
      transferBody:
        'Effectuez le virement avec les coordonnées affichées par Stripe. Votre facture passera en « Payée » dès que Stripe aura reçu les fonds (1 à 3 jours).',
      cancelledTitle: 'Paiement annulé',
      cancelledBody:
        "Aucun montant n'a été débité. Vous pouvez reprendre le paiement quand vous le souhaitez.",
      resume: 'Reprendre le paiement',
      failed: "Le paiement n'a pas abouti. Aucun montant n'a été débité. Vous pouvez réessayer.",
      close: 'Fermer',
    },
    admin: {
      title: 'Facturation',
      testProject: 'Projet de test : séries TFA- / TAV-, clés Stripe de test.',
      summary: {
        quoteTotal: 'Total du devis',
        deposit: (p: string | number) => `Acompte (${p} %)`,
        invoiced: 'Facturé',
        collected: 'Encaissé',
        remaining: 'Reste à facturer',
      },
      depositPaidVia: (date: string) => `Acompte payé via Stripe le ${date}`,
      manualFactWarning:
        'Un paiement Stripe existe pour ce fait. Toute correction manuelle est journalisée.',
      auto: {
        depositLine: 'Facture d\'acompte : émise automatiquement à la signature du contrat',
        finalLine:
          'Facture finale : émise automatiquement après le PV de recette signé, déduction de l\'acompte',
        waitingContract: 'En attente du contrat',
        issued: (number: string) => `Émise ${number}`,
        finalHelper: 'La facture finale ne facture que le travail non déjà facturé en périodes.',
        finalOverInvoiced:
          'Facture finale non émise : le montant déjà facturé dépasse le devis. Émettez un avoir sur la facture concernée.',
        finalNothingToInvoice:
          'Facture finale non émise : rien à facturer, l’acompte et les factures de période couvrent déjà le devis. Une fois le solde réglé, enregistrez le solde reçu manuellement (correction journalisée).',
      },
      period: {
        open: 'Nouvelle facture de période',
        covered: 'Période couverte',
        from: 'Du',
        to: 'Au',
        helper: 'Mois civil ou sprint de deux semaines.',
        label: 'Désignation',
        days: 'Jours',
        rate: 'TJM HT',
        lineAmount: 'Montant HT',
        addLine: 'Ajouter une ligne',
        maxLines: '30 lignes maximum',
        removeLine: (n: number) => `Supprimer la ligne ${n}`,
        lineLegend: (n: number) => `Ligne ${n}`,
        references: 'Références',
        orderNumber: 'Numéro de commande',
        dueDate: "Date d'échéance",
        optional: 'facultatif',
        totalHt: 'Total HT',
        vat: 'TVA non applicable, art. 293 B du CGI',
        totalTtc: 'Total TTC',
        preview: 'Aperçu',
        issue: 'Émettre la facture',
        previewBanner:
          "Aperçu non conservé. Ce fichier n'est pas celui qui sera émis. Le numéro sera attribué à l'émission.",
        confirmTitle: 'Émettre la facture ?',
        confirmBody:
          'Un numéro définitif sera attribué, la facture sera figée et visible par le client, et un e-mail lui sera envoyé. Une facture émise ne peut être corrigée que par un avoir.',
        confirm: "Confirmer l'émission",
        issuing: 'Émission en cours…',
        cancel: 'Annuler',
        success: (number: string) => `Facture ${number} émise. Le client a été notifié par e-mail.`,
        alreadyIssued: 'Cette facture est déjà émise.',
        mailFailed:
          "Facture émise. L'e-mail n'a pas pu partir immédiatement, il sera renvoyé automatiquement.",
        partialResume: (number: string) =>
          `Facture ${number} émise, mais le lien de paiement n'a pas pu être préparé. Il sera recréé à la prochaine ouverture par le client.`,
        validationSummary: 'Corrigez les champs indiqués puis relancez l\'aperçu.',
        contractGuard:
          "Le contrat n'est pas encore signé : émettez les factures de période après l'acompte.",
        nothingToInvoice: 'Le montant à payer doit être supérieur à zéro.',
        generic:
          "La facture n'a pas pu être émise. Rien n'a été envoyé au client. Réessayez ; si l'erreur persiste, contactez le support technique.",
      },
      list: {
        caption: 'Factures du projet',
        columns: {
          number: 'Numéro',
          type: 'Type',
          issuedOn: 'Émise le',
          amount: 'Montant',
          status: 'Statut',
          hash: 'Empreinte',
          actions: 'Actions',
        },
        viewHash: "Voir l'empreinte",
        copyHash: "Copier l'empreinte",
        viewData: 'Voir les données',
        download: 'Télécharger',
        credit: 'Émettre un avoir',
        snapshotTitle: "Données figées à l'émission",
        readOnly: 'Lecture seule. Pour corriger, émettez un avoir.',
        payment: {
          title: 'Paiement',
          reference: 'Référence Stripe',
          mode: 'Mode',
          test: 'test',
          live: 'live',
          confirmedOn: 'Confirmé le',
          source: 'Source',
          verifiedWebhook: 'Webhook vérifié',
          copy: 'Copier',
        },
        empty: 'Aucune facture pour ce projet.',
      },
      credit: {
        heading: (number: string) => `Avoir sur la facture ${number}`,
        recap: (invoiced: string, credited: string, max: string) =>
          `Montant facturé ${invoiced}, déjà crédité ${credited}, crédit maximal ${max}`,
        total: 'Avoir total',
        partial: 'Avoir partiel',
        amountLabel: 'Montant à créditer',
        amountRange: (min: string, max: string) =>
          `Le montant doit être compris entre ${min} et ${max}.`,
        motif: 'Motif',
        motifHelper: "Le motif figure sur l'avoir remis au client.",
        counter: (n: number) => `${n} / 1000`,
        refundLabel: 'Rembourser aussi le client par Stripe',
        refundHelper: (fee: string) =>
          `Frais Stripe : ${fee} par remboursement, non restitués. Le remboursement est confirmé par Stripe sous 1 à 3 jours. Sans cette case, l'avoir est émis sans mouvement d'argent.`,
        unpaidHelper: "La facture n'étant pas payée, l'avoir l'annule sans remboursement.",
        preview: "Aperçu de l'avoir",
        issue: "Émettre l'avoir",
        confirmTitle: "Émettre l'avoir ?",
        confirmBodyBase:
          "L'avoir est un document légal numéroté : il ne pourra ni être modifié ni supprimé.",
        confirmRefund: (amount: string) => `Un remboursement de ${amount} sera demandé à Stripe.`,
        confirmNoRefund: 'Aucun remboursement ne sera effectué.',
        confirmSessionExpired:
          'Le lien de paiement en cours de cette facture sera expiré.',
        confirmNotify: 'Le client sera notifié par e-mail.',
        confirm: "Confirmer l'avoir",
        success: (creditNumber: string, invoiceNumber: string) =>
          `Avoir ${creditNumber} émis sur la facture ${invoiceNumber}.`,
        refundRequested: 'Remboursement demandé à Stripe : en attente de confirmation.',
        refundPending: 'Remboursement en attente de Stripe',
        refundedOn: (date: string) => `Remboursé le ${date}`,
        refundFailed:
          "Le remboursement Stripe a échoué. L'avoir reste valable. Traitez le remboursement depuis le tableau de bord Stripe.",
        error:
          "L'avoir n'a pas pu être émis. Rien n'a été modifié. Réessayez ; si l'erreur persiste, contactez le support technique.",
        overCredit: 'Le montant dépasse le crédit possible sur cette facture.',
      },
      pending: {
        heading: 'Paiements en attente ou à rapprocher',
        none: 'Aucun paiement en attente.',
        caption: 'Paiements en attente ou à rapprocher',
        columns: {
          invoice: 'Facture',
          receivedOn: 'Reçu le',
          expected: 'Montant attendu',
          received: 'Montant reçu',
          gap: 'Écart',
          status: 'Statut',
          reference: 'Référence Stripe',
          action: 'Action',
        },
        overpaid: (x: string) => `Trop perçu ${x}`,
        missing: (x: string) => `Manque ${x}`,
        statuses: {
          transfer_pending: 'Virement en attente',
          amount_mismatch: 'Écart de montant',
          unmatched: 'Paiement sans facture reconnue',
          failed: 'Échec du paiement',
        },
        openInStripe: 'Ouvrir dans Stripe',
        readOnlyHelper:
          "Cette vue est en lecture seule. Traitez l'écart dans Stripe (rapprochement, remboursement) ou émettez un avoir.",
        olderThan14: 'En attente depuis plus de 14 jours',
      },
    },
  },
} as const;
