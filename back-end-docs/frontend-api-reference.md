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
  Body: { "name": string, "description": string?, "isPublic": boolean? } (`isPublic` default false; impostalo a true per renderlo sfogliabile dai player)
  Response 201: WorldResponse.
- GET /api/worlds (auth) -> [WorldResponse]
- GET /api/worlds/{id} (auth) -> WorldResponse
- PUT /api/worlds/{id} (GM owner o ADMIN) -> 200
- DELETE /api/worlds/{id} (GM owner o ADMIN) -> 204

WorldResponse: { "id": number, "name": string, "description": string?, "ownerId": number?, "ownerNickname": string?, "campaignCount": number, "isPublic": boolean }

### Worlds pubblici (discovery player)
- GET /api/worlds/public (auth, tutti i ruoli) -> lista dei world con isPublic=true.
- GET /api/worlds/public/{id} (auth, tutti i ruoli)
  - restituisce 200 solo se il world e pubblico o se il caller è GM/ADMIN/owner (in caso contrario 404).

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
- GET /api/sessions/{sessionId} (auth) -> SessionResponse
- PUT /api/sessions/{sessionId} (GM owner o ADMIN)
  Body identico alla create (SessionRequest).
  Response 200: SessionResponse aggiornato.
- DELETE /api/sessions/{sessionId} (GM owner o ADMIN) -> 204

SessionResponse: { "id": number, "title": string, "sessionNumber": number, "sessionDate": "YYYY-MM-DD"?, "notes": string?, "campaignId": number, "ownerId": number?, "ownerNickname": string? }

## NPC
Visibilita: GM/ADMIN vedono tutto; PLAYER/VIEWER solo isVisibleToPlayers=true. gmNotes visibile solo a owner/GM/ADMIN.

- POST /api/npcs (GM/ADMIN)
  Body: { "worldId": number, "name": string, ... } con tutti gli altri campi opzionali. Per una create rapida bastano worldId + name (isVisibleToPlayers default true). La tab di dettaglio puÇý compilare i campi avanzati della scheda 5e: race, roleOrClass, description, gmNotes (privato), alignment, size, creatureType, armorClass, max/current/temporary HP, hitDice, speed, ability scores (strength/dexterity/constitution/intelligence/wisdom/charisma), savingThrows, skills, damageResistances, damageImmunities, conditionImmunities, senses, languages, challengeRating, experiencePoints, difficultyClass, traits, actions, legendaryActions, reactions, lairActions, regionalEffects.
  Response 201: NpcResponse.
- GET /api/npcs (auth) -> [NpcResponse] filtrato
- GET /api/npcs/{id} (auth) -> NpcResponse (404 se nascosto)
- GET /api/npcs/world/{worldId} (auth) -> [NpcResponse]
- PUT /api/npcs/{id} (GM/ADMIN) -> 200
- DELETE /api/npcs/{id} (GM/ADMIN) -> 204

NpcResponse: { "id": number, "worldId": number, "ownerId": number?, "ownerNickname": string?, "name": string, "race": string?, "roleOrClass": string?, "description": string?, "gmNotes": string? (solo owner/GM/ADMIN), "isVisibleToPlayers": boolean, "alignment": string?, "size": string?, "creatureType": string?, "armorClass": number?, "maxHitPoints": number?, "currentHitPoints": number?, "temporaryHitPoints": number?, "hitDice": string?, "speed": string?, "strength": number?, "dexterity": number?, "constitution": number?, "intelligence": number?, "wisdom": number?, "charisma": number?, "savingThrows": string?, "skills": string?, "damageResistances": string?, "damageImmunities": string?, "conditionImmunities": string?, "senses": string?, "languages": string?, "challengeRating": string?, "experiencePoints": number?, "difficultyClass": number?, "traits": string?, "actions": string?, "legendaryActions": string?, "reactions": string?, "lairActions": string?, "regionalEffects": string? }.

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

## Player Characters
- POST /api/characters (auth)
  Body: PlayerCharacterRequest con tutti i campi della scheda 5e: worldId, name, race, characterClass + subclass, background/alignment, level (default 1), exp (default 0), inspiration, proficiencyBonus, ability scores (Str/Dex/Con/Int/Wis/Cha), flag di competenza per tiri salvezza e skill (acrobatics... survival), parametri di combattimento (armorClass, speed, initiativeModifier, max/current/temp HP, hitDice, deathSaveSuccesses/Failures), valori passivi (perception/investigation/insight), blocchi testuali (personality/ideals/bonds/flaws/appearance/backstory/features, allies/organizations, treasure, proficienciesAndLanguages, otherProficiencies, attacksAndSpellcasting, equipment), spellcasting (spellcastingClass, spellSaveDC, spellAttackBonus, knownSpells, preparedSpells, spellSlots, spells) e note (otherNotes, gmNotes) più il flag isVisibleToPlayers (default true).
  - Campo `knownLanguages`: array di stringhe (enum CharacterLanguage) che rappresenta le lingue conosciute. Se omesso o vuoto viene assegnato automaticamente almeno `COMMON`.
  Response 201: PlayerCharacterResponse con tutti i campi pubblici e gmNotes solo per owner/GM/ADMIN.
- GET /api/characters/my (auth) -> lista dei personaggi dell’utente corrente (gmNotes sempre inclusi).
- GET /api/characters/{id} (auth) -> PlayerCharacterResponse, 404 se personaggio nascosto e non sei owner/GM/ADMIN.
- GET /api/characters/world/{worldId} (auth) -> lista filtrata (GM/ADMIN vedono tutto, player/viewer solo i propri o isVisibleToPlayers=true).
- PUT /api/characters/{id} (owner o GM/ADMIN) -> aggiorna i campi (worldId richiesto).
- DELETE /api/characters/{id} (owner o ADMIN) -> 204.

PlayerCharacterResponse: { "id": number, "worldId": number, "ownerId": number, "ownerNickname": string?, tutti i campi pubblici del PG, "gmNotes": string? (solo owner/GM/ADMIN), "isVisibleToPlayers": boolean }.
Include inoltre `knownLanguages`: ["COMMON","ELVISH", ...] usato dal pannello chat.

## Campaign player join flow
- POST /api/campaigns/{campaignId}/join-requests (auth)
  Body: { "characterId": number } (il PG deve appartenere allo stesso world e all'utente corrente).
  Response 201: CampaignPlayerResponse con status PENDING. 409 se esiste gia una richiesta PENDING/APPROVED per stesso PG+campaign, 400 se world mismatch.
- GET /api/campaigns/{campaignId}/join-requests[?status=PENDING] (solo ADMIN o GM owner della campaign)
  Response: lista CampaignPlayerResponse filtrabile per status (enum PENDING/APPROVED/REJECTED/LEFT/KICKED).
- GET /api/campaigns/{campaignId}/my-join-request (auth) -> CampaignPlayerResponse relativo all'utente corrente per quella campagna; 404 se non esiste richiesta/iscrizione.
- POST /api/campaigns/{campaignId}/join-requests/{campaignPlayerId}/approve (owner GM o ADMIN) -> status=APPROVED.
- POST /api/campaigns/{campaignId}/join-requests/{campaignPlayerId}/reject (owner GM o ADMIN) -> status=REJECTED.
- GET /api/campaigns/{campaignId}/players (auth)
  Response: lista CampaignPlayerResponse con status APPROVED, filtrata sulla visibilita del PG (player/viewer vedono solo personaggi pubblici o propri).
- GET /api/campaign-players/my (auth)
  Response: lista delle richieste relative all'utente corrente (tutti gli status).
- GET /api/join-requests/my (auth)
  Response: lista delle richieste inviate dal player (tutti gli status) utile per mostrare lo stato per ciascuna campagna.
- GET /api/dm/join-requests (solo ROLE_GM o ROLE_ADMIN)
  Response: lista aggregata di tutte le richieste con status PENDING delle campagne possedute (per ADMIN include tutte le campagne del sistema).

CampaignPlayerResponse: { "id": number, "campaignId": number, "campaignName": string?, "worldId": number?, "characterId": number?, "characterName": string?, "characterLevel": number?, "characterClass": string?, "characterSubclass": string?, "playerId": number?, "playerNickname": string?, "status": "PENDING" | "APPROVED" | "REJECTED", "message": string?, "decisionById": number?, "decisionByNickname": string?, "createdAt": string?, "updatedAt": string? }.

## Session Events (timeline)
Visibilita come NPC/Location/Item; player/viewer ricevono solo eventi con isVisibleToPlayers=true.

- POST /api/session-events (GM/ADMIN)
  Body: { "sessionId": number, "title": string, "type": string?, "description": string?, "inGameTime": string?, "isVisibleToPlayers": boolean? } (default true)
  Response 201: SessionEventResponse.
- PUT /api/session-events/{id} (GM/ADMIN) -> 200
- DELETE /api/session-events/{id} (GM/ADMIN) -> 204
- GET /api/sessions/{sessionId}/events (auth) -> [SessionEventResponse] filtrato

SessionEventResponse: { "id": number, "sessionId": number, "ownerId": number?, "ownerNickname": string?, "title": string, "type": string?, "description": string?, "inGameTime": string?, "isVisibleToPlayers": boolean, "createdAt": ISO-8601 string }

## Session Chat
- POST /api/sessions/{sessionId}/chat/messages (GM owner, ADMIN o player APPROVED)
  Body: { "content": string, "language": "COMMON" | "ELVISH" | "DRACONIC" | ..., "senderCharacterId": number?, "messageType": "IC"|"OOC"? }
  - I player devono indicare il proprio `senderCharacterId` approvato nella campaign e una lingua presente in `knownLanguages`. I GM/ADMIN owner possono omettere `senderCharacterId` (parlano come DM) o indicare un PG approvato che possiedono.
  Response 201: SessionChatMessageResponse con `contentVisible` già filtrato per chi invia.
- GET /api/sessions/{sessionId}/chat/messages[?from=ISO_INSTANT] (stesse regole di permesso)
  Response 200: [SessionChatMessageResponse] ordinati per createdAt; `from` permette refresh incrementale.

SessionChatMessageResponse: {
  "id": number,
  "sessionId": number,
  "senderUserId": number,
  "senderNickname": string,
  "senderCharacterId": number?,
  "senderCharacterName": string?,
  "language": "ELVISH",
  "contentVisible": string, // testo in chiaro se la lingua è nota, altrimenti obfuscated tipo "<<ELVISH>> ..."
  "messageType": string?,
  "createdAt": ISO-8601 string
}

## Dashboard aggregata
- GET /api/dashboard (auth)
  Response: { "view": "GM" | "PLAYER", "stats": { "worldCount": number, ... }, "recentEvents": [SessionEventResponse], "pendingJoinRequests": [CampaignPlayerResponse], "myCharacters": [PlayerCharacterResponse] }.
  - Il backend restituisce automaticamente la vista appropriata in base ai ruoli (GM: include pending join requests, conteggi globali; PLAYER: include solo dati visibili e i propri personaggi).

## Status code attesi (sintesi)
- 200 OK per GET/PUT riusciti; 201 Created per POST; 204 No Content per DELETE.
- 400 Bad Request per validazioni o valori ruolo/stato non validi.
- 401 Unauthorized se manca o e errata l'autenticazione.
- 403 Forbidden per ruoli non autorizzati o ownership violata.
- 404 Not Found per risorse inesistenti o nascoste (NPC/Location/Item/SessionEvent/PlayerCharacter per player/viewer).
- 409 Conflict per email gia registrata o richieste campagne duplicate.

## Esempio di autenticazione Basic in header
Authorization: Basic base64(email:password)

Usa questi contratti per generare schermate, form e chiamate HTTP nel frontend Flutter. Le risposte includono sempre gli ID necessari per correlare le risorse (worldId, campaignId, sessionId, ownerId). Visibilita e ruoli vanno rispettati lato UI (nascondere campi GM-only ai player).
