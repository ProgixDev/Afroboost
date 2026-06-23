import type { Plan } from '@/types';

/** Monthly base prices in CAD. Annual applies a 15% discount. */
export const PLAN_MONTHLY: Record<Plan, number> = {
  decouverte: 49,
  performance: 97,
  premium: 197,
};

export const PLAN_FEATURES: Record<Plan, string[]> = {
  decouverte: [
    '12 publications IA / mois',
    'Agent IA téléphonique 200 appels',
    'Inbox unifiée',
    'CRM jusqu’à 500 clients',
  ],
  performance: [
    'Publications illimitées',
    'Agent IA + transferts intelligents',
    'Réponses Avis Google automatiques',
    'Rapport hebdomadaire IA',
    'CRM illimité',
  ],
  premium: [
    'Tout Performance',
    'Multi-établissements',
    'Analyses avancées',
    'Support prioritaire 24/7',
  ],
};

export const annualPrice = (monthly: number) => Math.round(monthly * 0.85);
