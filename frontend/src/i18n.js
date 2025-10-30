import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  fr: {
    translation: {
      nav: {
        dashboard: 'Tableau de bord',
        contacts: 'Contacts',
        campaigns: 'Campagnes',
        analytics: 'Analytics',
        calendar: 'Calendrier',
        admin: 'Administration',
        pricing: 'Tarifs'
      },
      dashboard: {
        title: 'Tableau de bord',
        totalContacts: 'Contacts totaux',
        activeCampaigns: 'Campagnes actives',
        emailsSent: 'Emails envoyés',
        openRate: 'Taux d\'ouverture',
        clickRate: 'Taux de clic',
        recentCampaigns: 'Campagnes récentes',
        performance: 'Performance'
      },
      contacts: {
        title: 'Gestion des contacts',
        addContact: 'Ajouter un contact',
        importContacts: 'Importer des contacts',
        exportContacts: 'Exporter les contacts',
        name: 'Nom',
        email: 'Email',
        group: 'Groupe',
        tags: 'Tags',
        status: 'Statut',
        actions: 'Actions',
        active: 'Actif',
        inactive: 'Inactif',
        search: 'Rechercher...',
        filterByGroup: 'Filtrer par groupe',
        allGroups: 'Tous les groupes'
      },
      campaigns: {
        title: 'Campagnes email',
        createCampaign: 'Créer une campagne',
        campaignTitle: 'Titre de la campagne',
        subject: 'Objet',
        content: 'Contenu',
        language: 'Langue',
        schedule: 'Programmer',
        sendNow: 'Envoyer maintenant',
        status: 'Statut',
        draft: 'Brouillon',
        scheduled: 'Programmée',
        sent: 'Envoyée',
        sending: 'En cours d\'envoi',
        targetGroups: 'Groupes cibles',
        targetTags: 'Tags cibles',
        useAI: 'Utiliser l\'IA'
      },
      admin: {
        title: 'Administration',
        subtitle: 'Configuration complète de la plateforme',
        managePricing: 'Gérer les plans tarifaires',
        tabs: {
          api: 'Clés IA',
          whatsapp: 'WhatsApp',
          stripe: 'Paiements',
          company: 'Entreprise',
          settings: 'Général'
        },
        apiKeys: {
          title: 'Clés API Intelligence Artificielle',
          subtitle: 'Configuration des services IA pour la génération de contenu',
          openaiKey: 'Clé API OpenAI (GPT-4-Turbo)',
          openaiDesc: 'Génération de contenu email et WhatsApp en FR/EN/DE',
          resendKey: 'Clé API Resend',
          resendDesc: 'Service d\'envoi d\'emails transactionnels',
          openaiInfo: 'IA conversationnelle avec mémoire contextuelle',
          resendInfo: 'Emails HTML professionnels avec tracking',
          getKey: 'Obtenir une clé →'
        },
        whatsapp: {
          title: 'WhatsApp Business API',
          subtitle: 'Configuration officielle Meta pour campagnes WhatsApp',
          accessToken: 'Access Token WhatsApp',
          accessTokenDesc: 'Token d\'accès depuis Meta Business Manager',
          phoneId: 'Phone Number ID',
          phoneIdDesc: 'Identifiant du numéro WhatsApp Business',
          verifyToken: 'Verify Token',
          verifyTokenDesc: 'Token de vérification du webhook',
          guide: 'Configuration WhatsApp Business',
          step1: 'Créer compte Meta Business',
          step2: 'Ajouter numéro WhatsApp Business',
          step3: 'Copier tokens ci-dessus',
          metaLink: 'Ouvrir Meta Business Manager →'
        },
        stripe: {
          title: 'Configuration Stripe',
          subtitle: 'Intégration des paiements sécurisés',
          publishableKey: 'Clé Publishable',
          publishableKeyDesc: 'Clé publique pour formulaire de paiement',
          secretKey: 'Clé Secret',
          secretKeyDesc: 'Clé secrète serveur (confidentiel)',
          testMode: 'Mode test Stripe',
          testModeDesc: 'Test cards disponibles: 4242 4242 4242 4242',
          dashboard: 'Dashboard Stripe →'
        },
        bank: {
          title: 'Coordonnées bancaires',
          subtitle: 'Pour virements et factures',
          iban: 'IBAN',
          bankName: 'Nom de la banque',
          currency: 'Devise'
        },
        company: {
          title: 'Informations entreprise',
          companyName: 'Nom de l\'entreprise',
          senderEmail: 'Email expéditeur',
          senderName: 'Nom expéditeur',
          senderNameDesc: 'Nom affiché dans les emails sortants'
        },
        save: 'Enregistrer les modifications',
        saved: 'Paramètres enregistrés avec succès',
        saving: 'Enregistrement...'
      },
      auth: {
        login: {
          title: 'Connexion',
          subtitle: 'Connectez-vous à votre compte',
          email: 'Email',
          password: 'Mot de passe',
          submit: 'Se connecter',
          loading: 'Connexion...',
          noAccount: 'Pas encore de compte ?',
          createAccount: 'Créer un compte',
          backHome: '← Retour à l\'accueil',
          success: 'Connexion réussie',
          welcome: 'Bienvenue',
          error: 'Erreur de connexion',
          invalidCredentials: 'Email ou mot de passe incorrect'
        },
        register: {
          title: 'Créer un compte',
          subtitle: 'Commencez gratuitement dès aujourd\'hui',
          name: 'Nom complet',
          email: 'Email',
          password: 'Mot de passe',
          confirmPassword: 'Confirmer le mot de passe',
          submit: 'Créer mon compte',
          loading: 'Création...',
          hasAccount: 'Vous avez déjà un compte ?',
          login: 'Se connecter',
          backHome: '← Retour à l\'accueil',
          success: 'Compte créé avec succès',
          welcomeAdmin: 'Bienvenue {name} ! Vous êtes administrateur.',
          welcomeUser: 'Bienvenue {name} !',
          error: 'Erreur d\'inscription',
          passwordMismatch: 'Les mots de passe ne correspondent pas',
          passwordTooShort: 'Le mot de passe doit contenir au moins 6 caractères'
        },
        logout: 'Déconnexion'
      },
      profile: {
        title: 'Profil utilisateur',
        account: 'Informations du compte',
        name: 'Nom',
        email: 'Email',
        role: 'Rôle',
        memberSince: 'Membre depuis',
        usage: 'Utilisation',
        emailsSent: 'Emails envoyés',
        contactsCreated: 'Contacts créés',
        campaignsCreated: 'Campagnes créées',
        subscription: 'Abonnement',
        currentPlan: 'Plan actuel',
        manage: 'Gérer l\'abonnement',
        apiKeys: 'Clés API personnelles',
        apiKeysDesc: 'Configuration de vos clés API',
        configureKeys: 'Configurer les clés',
        openaiStatus: 'OpenAI',
        stripeStatus: 'Stripe',
        configured: 'Configurée',
        notConfigured: 'Non configurée'
      },
      pricing: {
        title: 'Choisissez votre plan',
        starter: {
          name: 'Starter',
          price: 'Gratuit',
          features: [
            'Jusqu\'à 100 emails/mois',
            '1 utilisateur',
            'Templates simples',
            'Support par email'
          ]
        },
        pro: {
          name: 'Pro Coach',
          price: '49 CHF/mois',
          features: [
            'Jusqu\'à 5000 emails/mois',
            'IA Afroboost intégrée',
            'Relances automatiques',
            'Tableau de bord complet',
            'Support prioritaire'
          ]
        },
        business: {
          name: 'Business',
          price: '149 CHF/mois',
          features: [
            'Emails illimités',
            'Multi-utilisateurs',
            'IA avancée',
            'Intégration WhatsApp',
            'Branding personnalisé',
            'Support dédié 24/7'
          ]
        },
        tryNow: 'Essayer maintenant',
        subscribe: 'Souscrire'
      },
      common: {
        save: 'Enregistrer',
        cancel: 'Annuler',
        delete: 'Supprimer',
        edit: 'Modifier',
        close: 'Fermer',
        loading: 'Chargement...',
        success: 'Succès',
        error: 'Erreur',
        confirm: 'Confirmer'
      }
    }
  },
  en: {
    translation: {
      nav: {
        dashboard: 'Dashboard',
        contacts: 'Contacts',
        campaigns: 'Campaigns',
        analytics: 'Analytics',
        calendar: 'Calendar',
        admin: 'Admin',
        pricing: 'Pricing'
      },
      dashboard: {
        title: 'Dashboard',
        totalContacts: 'Total contacts',
        activeCampaigns: 'Active campaigns',
        emailsSent: 'Emails sent',
        openRate: 'Open rate',
        clickRate: 'Click rate',
        recentCampaigns: 'Recent campaigns',
        performance: 'Performance'
      },
      contacts: {
        title: 'Contact management',
        addContact: 'Add contact',
        importContacts: 'Import contacts',
        exportContacts: 'Export contacts',
        name: 'Name',
        email: 'Email',
        group: 'Group',
        tags: 'Tags',
        status: 'Status',
        actions: 'Actions',
        active: 'Active',
        inactive: 'Inactive',
        search: 'Search...',
        filterByGroup: 'Filter by group',
        allGroups: 'All groups'
      },
      campaigns: {
        title: 'Email campaigns',
        createCampaign: 'Create campaign',
        campaignTitle: 'Campaign title',
        subject: 'Subject',
        content: 'Content',
        language: 'Language',
        schedule: 'Schedule',
        sendNow: 'Send now',
        status: 'Status',
        draft: 'Draft',
        scheduled: 'Scheduled',
        sent: 'Sent',
        sending: 'Sending',
        targetGroups: 'Target groups',
        targetTags: 'Target tags',
        useAI: 'Use AI'
      },
      admin: {
        title: 'Administration',
        settings: 'Settings',
        apiKeys: 'API Keys',
        openaiKey: 'OpenAI API Key',
        resendKey: 'Resend API Key',
        companyName: 'Company name',
        senderEmail: 'Sender email',
        senderName: 'Sender name',
        save: 'Save',
        saved: 'Settings saved successfully'
      },
      pricing: {
        title: 'Choose your plan',
        starter: {
          name: 'Starter',
          price: 'Free',
          features: [
            'Up to 100 emails/month',
            '1 user',
            'Basic templates',
            'Email support'
          ]
        },
        pro: {
          name: 'Pro Coach',
          price: '$49/month',
          features: [
            'Up to 5000 emails/month',
            'Afroboost AI integrated',
            'Automatic follow-ups',
            'Complete dashboard',
            'Priority support'
          ]
        },
        business: {
          name: 'Business',
          price: '$149/month',
          features: [
            'Unlimited emails',
            'Multi-user access',
            'Advanced AI',
            'WhatsApp integration',
            'Custom branding',
            '24/7 dedicated support'
          ]
        },
        tryNow: 'Try now',
        subscribe: 'Subscribe'
      },
      common: {
        save: 'Save',
        cancel: 'Cancel',
        delete: 'Delete',
        edit: 'Edit',
        close: 'Close',
        loading: 'Loading...',
        success: 'Success',
        error: 'Error',
        confirm: 'Confirm'
      }
    }
  },
  de: {
    translation: {
      nav: {
        dashboard: 'Dashboard',
        contacts: 'Kontakte',
        campaigns: 'Kampagnen',
        analytics: 'Analytik',
        calendar: 'Kalender',
        admin: 'Verwaltung',
        pricing: 'Preise'
      },
      dashboard: {
        title: 'Dashboard',
        totalContacts: 'Kontakte insgesamt',
        activeCampaigns: 'Aktive Kampagnen',
        emailsSent: 'Gesendete E-Mails',
        openRate: 'Öffnungsrate',
        clickRate: 'Klickrate',
        recentCampaigns: 'Neueste Kampagnen',
        performance: 'Leistung'
      },
      contacts: {
        title: 'Kontaktverwaltung',
        addContact: 'Kontakt hinzufügen',
        importContacts: 'Kontakte importieren',
        exportContacts: 'Kontakte exportieren',
        name: 'Name',
        email: 'E-Mail',
        group: 'Gruppe',
        tags: 'Tags',
        status: 'Status',
        actions: 'Aktionen',
        active: 'Aktiv',
        inactive: 'Inaktiv',
        search: 'Suchen...',
        filterByGroup: 'Nach Gruppe filtern',
        allGroups: 'Alle Gruppen'
      },
      campaigns: {
        title: 'E-Mail-Kampagnen',
        createCampaign: 'Kampagne erstellen',
        campaignTitle: 'Kampagnentitel',
        subject: 'Betreff',
        content: 'Inhalt',
        language: 'Sprache',
        schedule: 'Planen',
        sendNow: 'Jetzt senden',
        status: 'Status',
        draft: 'Entwurf',
        scheduled: 'Geplant',
        sent: 'Gesendet',
        sending: 'Wird gesendet',
        targetGroups: 'Zielgruppen',
        targetTags: 'Ziel-Tags',
        useAI: 'KI verwenden'
      },
      admin: {
        title: 'Verwaltung',
        settings: 'Einstellungen',
        apiKeys: 'API-Schlüssel',
        openaiKey: 'OpenAI API-Schlüssel',
        resendKey: 'Resend API-Schlüssel',
        companyName: 'Firmenname',
        senderEmail: 'Absender-E-Mail',
        senderName: 'Absendername',
        save: 'Speichern',
        saved: 'Einstellungen erfolgreich gespeichert'
      },
      pricing: {
        title: 'Wählen Sie Ihren Plan',
        starter: {
          name: 'Starter',
          price: 'Kostenlos',
          features: [
            'Bis zu 100 E-Mails/Monat',
            '1 Benutzer',
            'Einfache Vorlagen',
            'E-Mail-Support'
          ]
        },
        pro: {
          name: 'Pro Coach',
          price: '49 CHF/Monat',
          features: [
            'Bis zu 5000 E-Mails/Monat',
            'Afroboost KI integriert',
            'Automatische Nachverfolgung',
            'Vollständiges Dashboard',
            'Prioritätssupport'
          ]
        },
        business: {
          name: 'Business',
          price: '149 CHF/Monat',
          features: [
            'Unbegrenzte E-Mails',
            'Multi-Benutzer-Zugriff',
            'Erweiterte KI',
            'WhatsApp-Integration',
            'Individuelles Branding',
            '24/7 dedizierter Support'
          ]
        },
        tryNow: 'Jetzt testen',
        subscribe: 'Abonnieren'
      },
      common: {
        save: 'Speichern',
        cancel: 'Abbrechen',
        delete: 'Löschen',
        edit: 'Bearbeiten',
        close: 'Schließen',
        loading: 'Lädt...',
        success: 'Erfolg',
        error: 'Fehler',
        confirm: 'Bestätigen'
      }
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
