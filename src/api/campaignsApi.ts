// src/api/campaignsApi.ts
import { httpClient } from './httpClient';
import type {
  CampaignResponse,
  CreateCampaignRequest,
  UpdateCampaignRequest,
} from '../types/api';

export const getCampaigns = async () => {
  const { data } = await httpClient.get<CampaignResponse[]>('/campaigns');
  return data;
};

export const getMyCampaigns = async () => {
  const { data } = await httpClient.get<CampaignResponse[]>('/campaigns/my');
  return data;
};

export const getCampaignById = async (campaignId: number) => {
  const { data } = await httpClient.get<CampaignResponse>(`/campaigns/${campaignId}`);
  return data;
};

export const getCampaignsByWorld = async (worldId: number) => {
  const { data } = await httpClient.get<CampaignResponse[]>(`/campaigns/world/${worldId}`);
  return data;
};

export const createCampaign = async (payload: CreateCampaignRequest) => {
  const { data } = await httpClient.post<CampaignResponse>('/campaigns', payload);
  return data;
};

export const updateCampaign = async (
  campaignId: number,
  payload: UpdateCampaignRequest,
) => {
  const { data } = await httpClient.put<CampaignResponse>(`/campaigns/${campaignId}`, payload);
  return data;
};

export const deleteCampaign = async (campaignId: number) => {
  await httpClient.delete(`/campaigns/${campaignId}`);
};
