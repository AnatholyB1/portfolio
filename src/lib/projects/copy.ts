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
        'Un document signé ne peut pas être remplacé. Révoquez d\'abord la signature depuis le journal des faits.',
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
} as const;
