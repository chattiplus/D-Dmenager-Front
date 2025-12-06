# Guida API per frontend Flutter (DD Manager)

Documento di riferimento per integrare il frontend Flutter con il backend DD Manager. Tutte le chiamate usano HTTP Basic (email/password) tranne dove indicato. I payload sono JSON.

## Convenzioni generali
- Host di sviluppo: http://localhost:8080
- Auth: HTTP Basic su tutte le chiamate eccetto POST /api/auth/register e POST /api/auth/login.
- Ruoli: ROLE_ADMIN e ROLE_GM possono mutare; ROLE_PLAYER e ROLE_VIEWER hanno sola lettura e vedono solo risorse con isVisibleToPlayers=true (NPC/Location/Item/SessionEvent).
- Errori: JSON ApiError con campi timestamp, status, error, message, path.

## Auth
- POST /api/auth/register (pubblico)
  Body: { "email": string, "password": string, "nickname": string, "role": "PLAYER" | "DM" | "VIEWER" }
  Response 201: UserResponse.
- POST /api/auth/login (pubblico)
  Body: { "email": string, "password": string }
  Response 200: UserResponse.
- GET /api/auth/me (auth)
  Response 200: UserResponse.
- PUT /api/auth/me (auth)
  Body: { "nickname": string?, "password": string? } (campi opzionali)
  Response 200: UserResponse.

UserResponse: { "id": number, "email": string, "nickname": string, "roles": [ "ROLE_GM", ... ] }

## World
- POST /api/worlds (GM/ADMIN)
  Body: { "name": string, "description": string? }
  Response 201: WorldResponse.
- GET /api/worlds (auth) -> [WorldResponse]
- GET /api/worlds/{id} (auth) -> WorldResponse
- PUT /api/worlds/{id} (GM owner o ADMIN) -> 200
- DELETE /api/worlds/{id} (GM owner o ADMIN) -> 204

WorldResponse: { "id": number, "name": string, "description": string?, "ownerId": number?, "ownerNickname": string?, "campaignCount": number }

## Campaign
- POST /api/campaigns (GM/ADMIN)
  Body: { "worldId": number, "name": string, "description": string?, "status": string? } (status default ACTIVE)
  Response 201: CampaignResponse.
- GET /api/campaigns (auth) -> [CampaignResponse]
- GET /api/campaigns/{id} (auth) -> CampaignResponse
- GET /api/campaigns/world/{worldId} (auth) -> [CampaignResponse]
- PUT /api/campaigns/{id} (GM owner o ADMIN) -> 200
- DELETE /api/campaigns/{id} (GM owner o ADMIN) -> 204

CampaignResponse: { "id": number, "name": string, "description": string?, "status": "ACTIVE" | ..., "worldId": number, "ownerId": number?, "ownerNickname": string? }

## Session
- POST /api/campaigns/{campaignId}/sessions (GM/ADMIN)
  Body: { "title": string, "sessionNumber": number, "sessionDate": "YYYY-MM-DD"?, "notes": string? }
  Response 201: SessionResponse.
- GET /api/campaigns/{campaignId}/sessions (auth) -> [SessionResponse]

SessionResponse: { "id": number, "title": string, "sessionNumber": number, "sessionDate": "YYYY-MM-DD"?, "notes": string?, "campaignId": number, "ownerId": number?, "ownerNickname": string? }

## NPC
Visibilita: GM/ADMIN vedono tutto; PLAYER/VIEWER solo isVisibleToPlayers=true. gmNotes visibile solo a GM/ADMIN.

- POST /api/npcs (GM/ADMIN)
  Body: { "worldId": number, "name": string, "race": string?, "roleOrClass": string?, "description": string?, "gmNotes": string?, "isVisibleToPlayers": boolean? } (default true)
  Response 201: NpcResponse.
- GET /api/npcs (auth) -> [NpcResponse] filtrato
- GET /api/npcs/{id} (auth) -> NpcResponse (404 se nascosto)
- GET /api/npcs/world/{worldId} (auth) -> [NpcResponse]
- PUT /api/npcs/{id} (GM/ADMIN) -> 200
- DELETE /api/npcs/{id} (GM/ADMIN) -> 204

NpcResponse: { "id": number, "worldId": number, "ownerId": number?, "ownerNickname": string?, "name": string, "race": string?, "roleOrClass": string?, "description": string?, "gmNotes": string? (solo GM/ADMIN), "isVisibleToPlayers": boolean }

## Location
Visibilita come NPC; parentLocationId opzionale.

- POST /api/locations (GM/ADMIN)
  Body: { "worldId": number, "parentLocationId": number?, "name": string, "type": string?, "description": string?, "gmNotes": string?, "isVisibleToPlayers": boolean? }
  Response 201: LocationResponse.
- GET /api/locations (auth) -> [LocationResponse]
- GET /api/locations/{id} (auth) -> LocationResponse (404 se nascosta)
- GET /api/locations/world/{worldId} (auth) -> [LocationResponse]
- PUT /api/locations/{id} (GM/ADMIN) -> 200
- DELETE /api/locations/{id} (GM/ADMIN) -> 204

LocationResponse: { "id": number, "worldId": number, "ownerId": number?, "ownerNickname": string?, "parentLocationId": number?, "name": string, "type": string?, "description": string?, "gmNotes": string? (solo GM/ADMIN), "isVisibleToPlayers": boolean }

## Item
Visibilita come NPC; locationId opzionale.

- POST /api/items (GM/ADMIN)
  Body: { "worldId": number, "locationId": number?, "name": string, "type": string?, "rarity": string?, "description": string?, "gmNotes": string?, "isVisibleToPlayers": boolean? }
  Response 201: ItemResponse.
- GET /api/items (auth) -> [ItemResponse]
- GET /api/items/{id} (auth) -> ItemResponse (404 se nascosto)
- GET /api/items/world/{worldId} (auth) -> [ItemResponse]
- PUT /api/items/{id} (GM/ADMIN) -> 200
- DELETE /api/items/{id} (GM/ADMIN) -> 204

ItemResponse: { "id": number, "worldId": number, "locationId": number?, "ownerId": number?, "ownerNickname": string?, "name": string, "type": string?, "rarity": string?, "description": string?, "gmNotes": string? (solo GM/ADMIN), "isVisibleToPlayers": boolean }

## Session Events (timeline)
Visibilita come NPC/Location/Item; player/viewer ricevono solo eventi con isVisibleToPlayers=true.

- POST /api/session-events (GM/ADMIN)
  Body: { "sessionId": number, "title": string, "type": string?, "description": string?, "inGameTime": string?, "isVisibleToPlayers": boolean? } (default true)
  Response 201: SessionEventResponse.
- PUT /api/session-events/{id} (GM/ADMIN) -> 200
- DELETE /api/session-events/{id} (GM/ADMIN) -> 204
- GET /api/sessions/{sessionId}/events (auth) -> [SessionEventResponse] filtrato

SessionEventResponse: { "id": number, "sessionId": number, "ownerId": number?, "ownerNickname": string?, "title": string, "type": string?, "description": string?, "inGameTime": string?, "isVisibleToPlayers": boolean, "createdAt": ISO-8601 string }

## Status code attesi (sintesi)
- 200 OK per GET/PUT riusciti; 201 Created per POST; 204 No Content per DELETE.
- 400 Bad Request per validazioni o valori ruolo/stato non validi.
- 401 Unauthorized se manca o e errata l'autenticazione.
- 403 Forbidden per ruoli non autorizzati o ownership violata.
- 404 Not Found per risorse inesistenti o nascoste (NPC/Location/Item/SessionEvent per player/viewer).
- 409 Conflict per email gia registrata.

## Esempio di autenticazione Basic in header
Authorization: Basic base64(email:password)

Usa questi contratti per generare schermate, form e chiamate HTTP nel frontend Flutter. Le risposte includono sempre gli ID necessari per correlare le risorse (worldId, campaignId, sessionId, ownerId). Visibilita e ruoli vanno rispettati lato UI (nascondere campi GM-only ai player).
