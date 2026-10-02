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
} as const;
