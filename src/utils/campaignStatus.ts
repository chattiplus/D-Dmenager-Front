export const CAMPAIGN_STATUS_VALUES = [
  'PLANNED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
] as const;

export type StrictCampaignStatus = typeof CAMPAIGN_STATUS_VALUES[number];

export const campaignStatusLabel = (status?: string | null): string => {
  switch (status) {
    case 'PLANNED':
      return 'Pianificata';
    case 'ACTIVE':
      return 'Attiva';
    case 'PAUSED':
      return 'In pausa';
    case 'COMPLETED':
      return 'Completata';
    default:
      return 'Sconosciuta';
  }
};

export const campaignStatusClass = (status?: string | null): string => {
  switch (status) {
    case 'PLANNED':
      return 'status-planned';
    case 'ACTIVE':
      return 'status-active';
    case 'PAUSED':
      return 'status-paused';
    case 'COMPLETED':
      return 'status-completed';
    default:
      return 'status-unknown';
  }
};

export const isCampaignStatus = (value?: string | null): value is StrictCampaignStatus =>
  CAMPAIGN_STATUS_VALUES.includes(value as StrictCampaignStatus);
