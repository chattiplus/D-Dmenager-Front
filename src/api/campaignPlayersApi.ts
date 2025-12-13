// src/api/campaignPlayersApi.ts
import { httpClient } from './httpClient';
import type {
  CampaignPlayerRequest,
  CampaignPlayerResponse,
  CampaignPlayerStatus,
} from '../types/api';

export const requestCampaignJoin = async (
  campaignId: number,
  payload: CampaignPlayerRequest,
) => {
  const { data } = await httpClient.post<CampaignPlayerResponse>(
    `/campaigns/${campaignId}/join-requests`,
    payload,
  );
  return data;
};

export const getCampaignJoinRequests = async (
  campaignId: number,
  status?: CampaignPlayerStatus,
) => {
  const { data } = await httpClient.get<CampaignPlayerResponse[]>(
    `/campaigns/${campaignId}/join-requests`,
    { params: status ? { status } : undefined },
  );
  return data;
};

export const approveJoinRequest = async (campaignId: number, requestId: number) => {
  const { data } = await httpClient.post<CampaignPlayerResponse>(
    `/campaigns/${campaignId}/join-requests/${requestId}/approve`,
    {},
  );
  return data;
};

export const rejectJoinRequest = async (campaignId: number, requestId: number) => {
  const { data } = await httpClient.post<CampaignPlayerResponse>(
    `/campaigns/${campaignId}/join-requests/${requestId}/reject`,
    {},
  );
  return data;
};

export const getMyJoinRequestForCampaign = async (campaignId: number) => {
  const { data } = await httpClient.get<CampaignPlayerResponse>(
    `/campaigns/${campaignId}/my-join-request`,
  );
  return data;
};

export const getMyJoinRequests = async () => {
  const { data } = await httpClient.get<CampaignPlayerResponse[]>('/join-requests/my');
  return data;
};

export const getDmPendingJoinRequests = async () => {
  const { data } = await httpClient.get<CampaignPlayerResponse[]>('/dm/join-requests');
  return data;
};

export const getCampaignPlayers = async (campaignId: number) => {
  const { data } = await httpClient.get<CampaignPlayerResponse[]>(
    `/campaigns/${campaignId}/players`,
  );
  return data;
};
