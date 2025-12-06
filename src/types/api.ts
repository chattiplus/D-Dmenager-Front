// src/types/api.ts
export type UserRole = 'ROLE_ADMIN' | 'ROLE_GM' | 'ROLE_PLAYER' | 'ROLE_VIEWER';
export type PublicRole = 'PLAYER' | 'DM' | 'VIEWER';

export interface ApiErrorResponse {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
  role: PublicRole;
}

export interface UserUpdateRequest {
  nickname?: string;
  password?: string;
}

export interface UserResponse {
  id: number;
  email: string;
  nickname: string;
  roles: UserRole[];
}

export interface WorldResponse {
  id: number;
  name: string;
  description?: string | null;
  ownerId?: number | null;
  ownerNickname?: string | null;
  campaignCount: number;
}

export interface CreateWorldRequest {
  name: string;
  description?: string;
}

export type UpdateWorldRequest = CreateWorldRequest;

export type CampaignStatus = 'PLANNED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | string;

export interface CampaignResponse {
  id: number;
  worldId: number;
  name: string;
  description?: string | null;
  status: CampaignStatus;
  ownerId?: number | null;
  ownerNickname?: string | null;
}

export interface CreateCampaignRequest {
  worldId: number;
  name: string;
  description?: string;
  status?: CampaignStatus;
}

export type UpdateCampaignRequest = Partial<CreateCampaignRequest>;

export interface SessionResponse {
  id: number;
  campaignId: number;
  title: string;
  sessionNumber: number;
  sessionDate?: string | null;
  notes?: string | null;
  ownerId?: number | null;
  ownerNickname?: string | null;
}

export interface CreateSessionRequest {
  title: string;
  sessionNumber: number;
  sessionDate?: string;
  notes?: string;
}

export interface NpcResponse {
  id: number;
  worldId: number;
  ownerId?: number | null;
  ownerNickname?: string | null;
  name: string;
  race?: string | null;
  roleOrClass?: string | null;
  description?: string | null;
  gmNotes?: string | null;
  isVisibleToPlayers: boolean;
}

export interface CreateNpcRequest {
  worldId: number;
  name: string;
  race?: string;
  roleOrClass?: string;
  description?: string;
  gmNotes?: string;
  isVisibleToPlayers?: boolean;
}

export type UpdateNpcRequest = Partial<CreateNpcRequest>;

export interface LocationResponse {
  id: number;
  worldId: number;
  parentLocationId?: number | null;
  ownerId?: number | null;
  ownerNickname?: string | null;
  name: string;
  type?: string | null;
  description?: string | null;
  gmNotes?: string | null;
  isVisibleToPlayers: boolean;
}

export interface CreateLocationRequest {
  worldId: number;
  parentLocationId?: number;
  name: string;
  type?: string;
  description?: string;
  gmNotes?: string;
  isVisibleToPlayers?: boolean;
}

export type UpdateLocationRequest = Partial<CreateLocationRequest>;

export interface ItemResponse {
  id: number;
  worldId: number;
  locationId?: number | null;
  ownerId?: number | null;
  ownerNickname?: string | null;
  name: string;
  type?: string | null;
  rarity?: string | null;
  description?: string | null;
  gmNotes?: string | null;
  isVisibleToPlayers: boolean;
}

export interface CreateItemRequest {
  worldId: number;
  locationId?: number;
  name: string;
  type?: string;
  rarity?: string;
  description?: string;
  gmNotes?: string;
  isVisibleToPlayers?: boolean;
}

export type UpdateItemRequest = Partial<CreateItemRequest>;

export interface SessionEventResponse {
  id: number;
  sessionId: number;
  ownerId?: number | null;
  ownerNickname?: string | null;
  title: string;
  type?: string | null;
  description?: string | null;
  inGameTime?: string | null;
  isVisibleToPlayers: boolean;
  createdAt: string;
}

export interface CreateSessionEventRequest {
  sessionId: number;
  title: string;
  type?: string;
  description?: string;
  inGameTime?: string;
  isVisibleToPlayers?: boolean;
}

export type UpdateSessionEventRequest = Partial<CreateSessionEventRequest>;
