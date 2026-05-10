import { computed, ref } from 'vue';
import { getMyJoinRequests } from '../../api/campaignPlayersApi';
import { getCampaigns, getMyCampaigns } from '../../api/campaignsApi';
import { getHistorySessionsByCampaign } from '../../api/sessionsApi';
import { useAuthStore } from '../../store/authStore';
import type {
  CampaignPlayerResponse,
  CampaignResponse,
  CampaignStatus,
  SessionResponse,
} from '../../types/api';
import { extractApiErrorMessage } from '../../utils/errorMessage';

export interface HistorySessionEntry {
  id: number;
  campaignId: number;
  campaignName: string;
  campaignDescription?: string | null;
  campaignStatus?: CampaignStatus | null;
  title: string;
  sessionNumber: number;
  sessionDate?: string | null;
  notes?: string | null;
  detailRouteName: 'dm-session-detail' | 'session-detail';
}

export interface HistoryCampaignGroup {
  campaignId: number;
  campaignName: string;
  campaignDescription?: string | null;
  campaignStatus?: CampaignStatus | null;
  pastSessions: HistorySessionEntry[];
  undatedSessions: HistorySessionEntry[];
}

export interface HistoryCalendarEvent extends HistorySessionEntry {
  dayKey: string;
  startsAt: Date;
}

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

const parseSessionDate = (value?: string | null) => {
  if (!value) {
    return null;
  }

  if (dateOnlyPattern.test(value)) {
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
      return null;
    }
    const [year, month, day] = parts as [number, number, number];
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getLocalDayKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const compareByDateDesc = (a: HistorySessionEntry, b: HistorySessionEntry) => {
  const aDate = parseSessionDate(a.sessionDate)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const bDate = parseSessionDate(b.sessionDate)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (aDate !== bDate) {
    return bDate - aDate;
  }
  return b.sessionNumber - a.sessionNumber;
};

const compareUndatedDesc = (a: HistorySessionEntry, b: HistorySessionEntry) => {
  if (a.sessionNumber !== b.sessionNumber) {
    return b.sessionNumber - a.sessionNumber;
  }
  return a.title.localeCompare(b.title, 'it');
};

const isPastSession = (sessionDate?: string | null) => {
  const parsed = parseSessionDate(sessionDate);
  if (!parsed) {
    return false;
  }

  if (sessionDate && dateOnlyPattern.test(sessionDate)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsed.getTime() < today.getTime();
  }

  return parsed.getTime() < Date.now();
};

const buildSessionEntry = (
  session: SessionResponse,
  campaign: CampaignResponse | Pick<CampaignPlayerResponse, 'campaignId' | 'campaignName' | 'message' | 'campaignStatus'>,
  detailRouteName: 'dm-session-detail' | 'session-detail',
): HistorySessionEntry => ({
  id: session.id,
  campaignId: session.campaignId,
  campaignName:
    'name' in campaign
      ? campaign.name
      : campaign.campaignName ?? `Campagna #${campaign.campaignId}`,
  campaignDescription:
    'description' in campaign
      ? campaign.description
      : ('message' in campaign ? campaign.message : undefined),
  campaignStatus:
    'status' in campaign ? campaign.status : campaign.campaignStatus ?? null,
  title: session.title,
  sessionNumber: session.sessionNumber,
  sessionDate: session.sessionDate ?? null,
  notes: session.notes ?? null,
  detailRouteName,
});

export const formatHistoryDate = (value?: string | null, options?: Intl.DateTimeFormatOptions) => {
  const parsed = parseSessionDate(value);
  if (!parsed) {
    return value ?? 'Data non disponibile';
  }

  return new Intl.DateTimeFormat('it-IT', options ?? { dateStyle: 'medium' }).format(parsed);
};

export const useProfileHistory = () => {
  const authStore = useAuthStore();
  const loading = ref(false);
  const error = ref('');
  const sessions = ref<HistorySessionEntry[]>([]);

  const detailRouteName = computed<'dm-session-detail' | 'session-detail'>(() =>
    authStore.canManageContent ? 'dm-session-detail' : 'session-detail',
  );

  const campaignsHistory = computed<HistoryCampaignGroup[]>(() => {
    const groups = new Map<number, HistoryCampaignGroup>();

    sessions.value.forEach((session) => {
      const existing = groups.get(session.campaignId) ?? {
        campaignId: session.campaignId,
        campaignName: session.campaignName,
        campaignDescription: session.campaignDescription,
        campaignStatus: session.campaignStatus,
        pastSessions: [],
        undatedSessions: [],
      };

      if (session.sessionDate && parseSessionDate(session.sessionDate)) {
        if (isPastSession(session.sessionDate)) {
          existing.pastSessions.push(session);
        }
      } else {
        existing.undatedSessions.push(session);
      }

      groups.set(session.campaignId, existing);
    });

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        pastSessions: [...group.pastSessions].sort(compareByDateDesc),
        undatedSessions: [...group.undatedSessions].sort(compareUndatedDesc),
      }))
      .filter((group) => group.pastSessions.length || group.undatedSessions.length)
      .sort((a, b) => {
        const aLatest = a.pastSessions[0] ? parseSessionDate(a.pastSessions[0].sessionDate)?.getTime() ?? 0 : 0;
        const bLatest = b.pastSessions[0] ? parseSessionDate(b.pastSessions[0].sessionDate)?.getTime() ?? 0 : 0;
        if (aLatest !== bLatest) {
          return bLatest - aLatest;
        }
        return a.campaignName.localeCompare(b.campaignName, 'it');
      });
  });

  const calendarEvents = computed<HistoryCalendarEvent[]>(() =>
    sessions.value
      .filter((session) => session.sessionDate && isPastSession(session.sessionDate))
      .map((session) => {
        const startsAt = parseSessionDate(session.sessionDate)!;
        return {
          ...session,
          dayKey: getLocalDayKey(startsAt),
          startsAt,
        };
      })
      .sort((a, b) => {
        if (a.startsAt.getTime() !== b.startsAt.getTime()) {
          return a.startsAt.getTime() - b.startsAt.getTime();
        }
        return a.sessionNumber - b.sessionNumber;
      }),
  );

  const undatedSessions = computed(() =>
    campaignsHistory.value.flatMap((campaign) => campaign.undatedSessions),
  );

  const hasPastSessions = computed(() =>
    campaignsHistory.value.some((campaign) => campaign.pastSessions.length > 0),
  );

  const loadHistory = async () => {
    loading.value = true;
    error.value = '';

    try {
      if (authStore.canManageContent) {
        const campaigns = authStore.hasRole('ROLE_ADMIN')
          ? await getCampaigns()
          : await getMyCampaigns();
        const sessionsLists = await Promise.all(
          campaigns.map((campaign) => getHistorySessionsByCampaign(campaign.id)),
        );

        sessions.value = campaigns.flatMap((campaign, index) =>
          (sessionsLists[index] ?? []).map((session) =>
            buildSessionEntry(session, campaign, detailRouteName.value),
          ),
        );
        return;
      }

      const requests = await getMyJoinRequests();
      const approvedRequests = Array.from(
        new Map<number, CampaignPlayerResponse>(
          requests
            .filter(
              (request) =>
                request.status === 'APPROVED' && typeof request.campaignId === 'number',
            )
            .map((request) => [request.campaignId as number, request]),
        ).values(),
      );

      const sessionsLists = await Promise.all(
        approvedRequests.map((request) => getHistorySessionsByCampaign(request.campaignId as number)),
      );

      sessions.value = approvedRequests.flatMap((request, index) =>
        (sessionsLists[index] ?? []).map((session) =>
          buildSessionEntry(session, request, detailRouteName.value),
        ),
      );
    } catch (loadError) {
      error.value = extractApiErrorMessage(
        loadError,
        'Impossibile caricare lo storico delle sessioni.',
      );
      sessions.value = [];
    } finally {
      loading.value = false;
    }
  };

  return {
    loading,
    error,
    campaignsHistory,
    calendarEvents,
    undatedSessions,
    hasPastSessions,
    loadHistory,
    formatHistoryDate,
  };
};
