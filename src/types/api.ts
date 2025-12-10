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
  isPublic: boolean;
}

export interface CreateWorldRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
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

export type CampaignPlayerStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface CampaignPlayerResponse {
  id: number;
  campaignId: number;
  campaignName?: string | null;
  worldId?: number | null;
  characterId?: number | null;
  characterName?: string | null;
  characterLevel?: number | null;
  characterClass?: string | null;
  characterSubclass?: string | null;
  playerId?: number | null;
  playerNickname?: string | null;
  status: CampaignPlayerStatus;
  message?: string | null;
  decisionById?: number | null;
  decisionByNickname?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CampaignPlayerRequest {
  characterId: number;
  message?: string;
}

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

type NullableNumber = number | null | undefined;
type NullableString = string | null | undefined;

export interface PlayerCharacterBase {
  name: string;
  race?: NullableString;
  characterClass?: NullableString;
  subclass?: NullableString;
  background?: NullableString;
  alignment?: NullableString;
  level?: NullableNumber;
  experiencePoints?: NullableNumber;
  inspiration?: boolean | null;
  proficiencyBonus?: NullableNumber;
  strength?: NullableNumber;
  dexterity?: NullableNumber;
  constitution?: NullableNumber;
  intelligence?: NullableNumber;
  wisdom?: NullableNumber;
  charisma?: NullableNumber;
  strengthSaveProficient?: boolean;
  dexteritySaveProficient?: boolean;
  constitutionSaveProficient?: boolean;
  intelligenceSaveProficient?: boolean;
  wisdomSaveProficient?: boolean;
  charismaSaveProficient?: boolean;
  acrobaticsProficient?: boolean;
  animalHandlingProficient?: boolean;
  arcanaProficient?: boolean;
  athleticsProficient?: boolean;
  deceptionProficient?: boolean;
  historyProficient?: boolean;
  insightProficient?: boolean;
  intimidationProficient?: boolean;
  investigationProficient?: boolean;
  medicineProficient?: boolean;
  natureProficient?: boolean;
  perceptionProficient?: boolean;
  performanceProficient?: boolean;
  persuasionProficient?: boolean;
  religionProficient?: boolean;
  sleightOfHandProficient?: boolean;
  stealthProficient?: boolean;
  survivalProficient?: boolean;
  maxHitPoints?: NullableNumber;
  currentHitPoints?: NullableNumber;
  temporaryHitPoints?: NullableNumber;
  armorClass?: NullableNumber;
  speed?: NullableNumber;
  initiativeModifier?: NullableNumber;
  hitDice?: NullableString;
  deathSaveSuccesses?: NullableNumber;
  deathSaveFailures?: NullableNumber;
  passivePerception?: NullableNumber;
  passiveInvestigation?: NullableNumber;
  passiveInsight?: NullableNumber;
  personalityTraits?: NullableString;
  ideals?: NullableString;
  bonds?: NullableString;
  flaws?: NullableString;
  appearance?: NullableString;
  backstory?: NullableString;
  featuresAndTraits?: NullableString;
  alliesAndOrganizations?: NullableString;
  treasure?: NullableString;
  proficienciesAndLanguages?: NullableString;
  otherProficiencies?: NullableString;
  attacksAndSpellcasting?: NullableString;
  equipment?: NullableString;
  spells?: NullableString;
  spellcastingClass?: NullableString;
  spellSaveDC?: NullableNumber;
  spellAttackBonus?: NullableNumber;
  knownSpells?: NullableString;
  preparedSpells?: NullableString;
  spellSlots?: NullableString;
  otherNotes?: NullableString;
  gmNotes?: NullableString;
  isVisibleToPlayers?: boolean;
}

export type PlayerCharacterRequest = PlayerCharacterBase;

export interface PlayerCharacterResponse extends PlayerCharacterBase {
  id: number;
  ownerId: number;
  ownerNickname?: string | null;
  gmNotes?: string | null;
  isVisibleToPlayers: boolean;
}

export interface DashboardStats {
  worldCount: number;
  campaignCount: number;
  sessionCount: number;
  npcCount: number;
  locationCount: number;
  itemCount: number;
  playerCharacterCount: number;
  sessionEventCount: number;
  pendingJoinRequests: number;
}

export interface DashboardResponse {
  view: 'GM' | 'PLAYER';
  stats: DashboardStats;
  recentEvents: SessionEventResponse[];
  pendingJoinRequests: CampaignPlayerResponse[];
  myCharacters: PlayerCharacterResponse[];
}

export interface DiceRollResponse {
  value: number;
  sides: number;
  rolledAt: string; // ISO string
}