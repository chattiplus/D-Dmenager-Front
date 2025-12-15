# Documentazione del Progetto DD Manager

## 1. Introduzione e obiettivi
 DD Manager e un backend Spring Boot 3 (Java 17) che supporta il Game Master (GM) nella gestione di campagne di gioco di ruolo stile D&D. Il sistema offre API REST per amministrare mondi, campagne, sessioni, NPC, luoghi, oggetti, schede personaggio e log degli eventi di sessione, con controlli di sicurezza basati su ruoli e visibilita selettiva per i giocatori.

## 2. Panoramica architetturale
- Architettura a livelli: controller REST su /api/**, servizi applicativi, repository JPA, PostgreSQL come storage.
- Tecnologie: Java 17, Spring Boot 3, Spring MVC, Spring Security (JWT Bearer), Spring Data JPA, Maven, Lombok, Jakarta Validation.
- Struttura dei package: user (dto/model/repository/service/controller), world, campaign, session, npc, location, item, sessionlog, security, common/error, controller health.

## 3. Modello di dominio
- User: email (unique), password (BCrypt), nickname, ruoli (ROLE_ADMIN, ROLE_GM, ROLE_PLAYER, ROLE_VIEWER).
- Role: nome ruolo.
- World: id, name, description, flag `isPublic` (controlla la visibilita lato player) e owner (User); relazioni 1-N con Campaign, Npc, Location, Item.
- Campaign: id, name, description, status (enum), world (ManyToOne), owner (User); relazione 1-N con Session.
- Session: id, title, sessionNumber, sessionDate, notes, campaign (ManyToOne), owner (User); relazioni 1-N con SessionEvent.
- Npc: id, world (ManyToOne), owner (User), name, race, roleOrClass, description pubblica, gmNotes visibili solo a owner/GM/ADMIN, flag isVisibleToPlayers (bool). L'entita include opzionalmente tutti i campi principali di uno statblock D&D 5e: alignment, size, creatureType, armorClass, max/current/temporary HP, hitDice, speed (anche multi-movimento), ability score (Str/Dex/Con/Int/Wis/Cha), savingThrows e skills descrittivi, damage/condition resistances & immunities, senses, languages, challengeRating con eventuali experiencePoints e difficultyClass custom, oltre ai blocchi testuali per traits, actions, legendaryActions, reactions, lairActions e regionalEffects. Tutti questi campi avanzati sono nullable cosÇª l'NPC puÇý essere creato rapidamente e arricchito in un secondo momento.
- Location: id, world (ManyToOne), parentLocation opzionale, owner (User), name, type, description, gmNotes, isVisibleToPlayers.
- Item: id, world (ManyToOne), location opzionale (ManyToOne), owner (User), name, type, rarity, description, gmNotes, isVisibleToPlayers.
- SessionEvent: id, session (ManyToOne), owner (User), title, type, description, inGameTime, isVisibleToPlayers, createdAt.
- PlayerCharacter: id, world (ManyToOne), owner (User), name, razza, characterClass + subclass, background/alignment, level (min 1), experiencePoints (>=0), inspiration flag, proficiencyBonus. Comprende tutte le statistiche numeriche di D&D 5e (Str/Dex/Con/Int/Wis/Cha 1-30), flag di competenza ai tiri salvezza e alle 18 skill standard, attributi di combattimento (armorClass, speed, initiativeModifier, hit dice, HP max/current/temp, deathSaveSuccesses/Failures), valori passivi (perception/investigation/insight). Comprende inoltre blocchi testuali per proficienciesAndLanguages, otherProficiencies, attacksAndSpellcasting, equipment, known/prepared spells, spellcastingClass/save DC/attack bonus/slots, alliesAndOrganizations, treasure, personality/ideals/bonds/flaws/appearance/backstory/otherNotes oltre a gmNotes private, il flag isVisibleToPlayers e il set `knownLanguages` (CharacterLanguage enum) usato dalla chat per determinare cosa il PG comprende (default sempre COMMON).
- CampaignPlayer: rappresenta la richiesta/partecipazione di un PlayerCharacter a una Campaign, con campi campaign (ManyToOne), character (ManyToOne), player (owner del PG), status (CampaignPlayerStatus: PENDING, APPROVED, REJECTED), message (testo opzionale inviato dal player), decisionBy (GM/ADMIN che ha deliberato), createdAt/updatedAt automatici.
- SessionChatMessage: id, session (ManyToOne), senderUser (User), senderCharacter opzionale (PlayerCharacter approvato), CharacterLanguage, contentRaw, messageType opzionale e createdAt. I messaggi vengono salvati sempre in chiaro e trasformati runtime in base alla lingua conosciuta dal viewer tramite un LanguageObfuscator.
- Relazioni chiave: World 1-N Campaign; Campaign 1-N Session; Session 1-N SessionEvent; World 1-N Npc/Location/Item; Location puo avere parentLocation.

## 4. Gestione ruoli e sicurezza
- Ruoli: ROLE_ADMIN, ROLE_GM, ROLE_PLAYER, ROLE_VIEWER.
- Registrazione: campo role (PLAYER/DM/VIEWER) mappato su ROLE_PLAYER / ROLE_GM / ROLE_VIEWER; email univoca, password codificata con BCrypt.
- Autenticazione: JWT Bearer ottenuto da POST /api/auth/login (email/password). Endpoint pubblici: POST /api/auth/register e POST /api/auth/login. Tutti gli altri endpoint richiedono `Authorization: Bearer <token>`; i token includono le claim principali (userId, email, nickname, ruoli) e hanno scadenza configurabile.
- Autorizzazioni: mutate su World/Campaign/Session/Npc/Location/Item/SessionEvent consentite solo a ADMIN o GM. PLAYER/VIEWER possono leggere ma vedono solo risorse con isVisibleToPlayers=true per NPC/Location/Item/SessionEvent. GM puo mutare solo le proprie risorse dove previsto, ADMIN ovunque.

## 5. Gestione errori
- Formato ApiError: timestamp, status, error, message, path.
- Mappature principali (GlobalExceptionHandler): InvalidCredentialsException -> 401; EmailAlreadyUsedException -> 409; InvalidRoleException -> 400; ResourceNotFoundException -> 404; UnauthorizedException/UsernameNotFoundException -> 401; AccessDeniedException -> 403; MethodArgumentNotValidException -> 400 con dettagli; eccezioni generiche -> 500 "Unexpected error".

## 6. Flussi principali
- Registrazione utente: POST /api/auth/register con email/password/nickname/role; assegna ruolo applicativo e salva password BCrypt.
- Login e utente corrente: POST /api/auth/login restituisce `AuthResponse` (token JWT + UserResponse); GET /api/auth/me ritorna l'utente autenticato usando il token; PUT /api/auth/me aggiorna nickname/password mantenendo il flusso stateless.
- World: POST /api/worlds (GM/ADMIN) crea mondo; GET /api/worlds/{id} restituisce il dettaglio solo se il world è pubblico o appartiene ad una campagna a cui l’utente è stato approvato; PUT/DELETE /api/worlds/{id} con regole di ownership (GM owner, ADMIN sempre). I player vedono in /api/worlds solo i world pubblici più quelli privati legati a campagne APPROVED.
- Campaign: POST /api/campaigns (GM/ADMIN) su world esistente; GET lista/dettaglio; PUT/DELETE con controllo owner per GM.
- Session: POST /api/campaigns/{campaignId}/sessions (GM/ADMIN) crea sessione; GET lista per campagna; GET /api/sessions/{id} restituisce il dettaglio; PUT/DELETE /api/sessions/{id} permettono di aggiornare o cancellare la sessione (solo GM owner della campaign o ADMIN).
- NPC: CRUD sotto /api/npcs; GET filtrati per visibilita; mutate solo GM/ADMIN. La dashboard puÇý creare rapidamente un NPC inviando solo worldId+name (tutti gli altri campi sono opzionali e restano null), mentre la tab NPC dello stesso frontend utilizza gli stessi endpoint per compilare/aggiornare l'intero statblock 5e (statistiche, HP/AC, abilita e tiri salvezza, challenge/difficulty, tratti/azioni). gmNotes sono incluse nella response solo se l'utente autenticato Çù owner, GM o ADMIN.
- Location: CRUD sotto /api/locations; parentLocation opzionale; visibilita e gmNotes come NPC.
- Item: CRUD sotto /api/items con opzionale locationId; visibilita e gmNotes come NPC; mutate solo GM/ADMIN.
- SessionEvent: /api/session-events per mutate (GM/ADMIN); GET /api/sessions/{sessionId}/events restituisce timeline filtrata per ruolo.
- Session chat: POST /api/sessions/{sessionId}/chat/messages permette a GM/ADMIN owner e ai player approvati (via CampaignPlayer) di inviare messaggi indicando il PG e la lingua conosciuta; GET /api/sessions/{sessionId}/chat/messages restituisce la cronologia (filtrabile da timestamp) con `contentVisible` in chiaro per GM/ADMIN o player che conoscono la lingua, e obfuscato stile lingua (Elvish/Draconic/Egyptian ecc.) per gli altri. Il service Ã¨ thread-safe grazie a lock per-session e ai transactional boundary.
- PlayerCharacter: /api/characters consente create (chiunque autenticato, owner=utente corrente), GET delle proprie schede (/my), GET by id/world con masking di gmNotes e filtri isVisibleToPlayers; update riservata a owner o GM/ADMIN, delete ad owner o ADMIN. Il payload copre l'intera scheda 5e (ability score, salvezze/skill, HP/death save, proficiencies, spellcasting, story fields).
- Campaign join flow: /api/campaigns/{campaignId}/join-requests (POST) permette ai player di inviare una richiesta con uno dei propri PG (validazione world); GM owner o ADMIN possono leggere le richieste (GET), approvarle/rifiutarle (POST .../approve|reject); /api/campaigns/{campaignId}/players restituisce i partecipanti APPROVED rispettando la visibilita del personaggio; /api/campaign-players/my mostra lo storico richieste di un player.
- Player journey: crea e mantiene i propri PlayerCharacter tramite /api/characters (create/update/delete e lista personale), sfoglia i mondi pubblici con /api/worlds/public (dettaglio via /api/worlds/public/{id} con fallback sulle membership private), consulta le campagne disponibili e invia richieste di join usando i propri PG; lo stato di ogni richiesta è disponibile sia in /api/join-requests/my sia in /api/campaigns/{campaignId}/my-join-request.
- DM journey: oltre a gestire mondi/campagne/sessioni, decide se un world è pubblico settando `isPublic` in creazione/aggiornamento, controlla le richieste per singola campagna e dispone di una vista aggregata /api/dm/join-requests per vedere tutte le richieste PENDING delle campagne che possiede (o, se ADMIN, di tutto il sistema) e approvarle/rifiutarle rapidamente.

## 7. Panoramica API (estratto)
- Auth: POST /api/auth/register (pubblico), POST /api/auth/login (pubblico, ritorna token), GET /api/auth/me, PUT /api/auth/me (richiedono Bearer token).
- Worlds: GET /api/worlds applica automaticamente le regole di visibilità (GM/ADMIN vedono tutto, PLAYER vedono i world pubblici più quelli privati delle campagne approvate); GET /api/worlds/{id} restituisce il dettaglio solo se autorizzati; POST/PUT/DELETE /api/worlds/{id} (GM owner o ADMIN).
- Worlds pubblici: GET /api/worlds/public e GET /api/worlds/public/{id} (auth; il dettaglio torna 404 se il world non è pubblico o legato a una campagna approvata).
- Campaigns: GET /api/campaigns, GET /api/campaigns/{id}, GET /api/campaigns/world/{worldId} (auth); POST/PUT/DELETE /api/campaigns/{id} (GM owner o ADMIN).
- Sessions: GET /api/campaigns/{campaignId}/sessions (auth); POST /api/campaigns/{campaignId}/sessions (GM/ADMIN owner della campaign); GET /api/sessions/{id}, PUT /api/sessions/{id} e DELETE /api/sessions/{id} per dettaglio/update/delete (update/delete riservati al GM owner o ADMIN).
- NPC: GET /api/npcs, GET /api/npcs/{id}, GET /api/npcs/world/{worldId} (auth, filtro visibilita); POST/PUT/DELETE /api/npcs/{id?} (GM/ADMIN).
- Locations: GET /api/locations, GET /api/locations/{id}, GET /api/locations/world/{worldId} (auth, filtro visibilita); POST/PUT/DELETE /api/locations/{id?} (GM/ADMIN).
- Items: GET /api/items, GET /api/items/{id}, GET /api/items/world/{worldId} (auth, filtro visibilita); POST/PUT/DELETE /api/items/{id?} (GM/ADMIN).
- SessionEvents: GET /api/sessions/{sessionId}/events (auth, filtrato); POST /api/session-events, PUT /api/session-events/{id}, DELETE /api/session-events/{id} (GM/ADMIN).
- SessionChat: GET /api/sessions/{sessionId}/chat/messages (auth, solo campaign owner/ADMIN o player APPROVED); POST /api/sessions/{sessionId}/chat/messages (stesse regole) salva il messaggio e ritorna la vista filtrata per il sender. I contenuti sono memorizzati in chiaro (contentRaw) ma esposti come `contentVisible` in base alle lingue conosciute dal viewer.
- PlayerCharacters: POST /api/characters, GET /api/characters/my, GET /api/characters/{id}, GET /api/characters/world/{worldId}, PUT /api/characters/{id}, DELETE /api/characters/{id} con visibilita e permessi descritti sopra.
- CampaignPlayers: POST /api/campaigns/{id}/join-requests, GET /api/campaigns/{id}/join-requests[?status=], POST /api/campaigns/{id}/join-requests/{campaignPlayerId}/approve, POST .../reject, GET /api/campaigns/{id}/players (solo APPROVED, filtrati), GET /api/campaigns/{id}/my-join-request (stato della richiesta dell'utente corrente), GET /api/campaign-players/my e GET /api/join-requests/my per l’elenco completo dell’utente; per i GM/ADMIN esiste la vista aggregata GET /api/dm/join-requests per tutte le richieste PENDING delle campagne possedute o (per ADMIN) di tutto il sistema.
- Dashboard: GET /api/dashboard restituisce un riepilogo (stats, eventi recenti, richieste pendenti e personaggi dell’utente) differenziato tra vista GM e PLAYER.

## 8. Persistenza e schema dati
- Tabelle principali: users (id PK, email unique) con users_roles (user_id, role_id); roles (id PK, name unique); worlds (id PK, owner_id FK -> users); campaigns (id PK, world_id FK -> worlds, owner_id FK -> users); sessions (id PK, campaign_id FK -> campaigns, owner_id FK -> users); npcs (id PK, world_id FK -> worlds, owner_id FK -> users); locations (id PK, world_id FK -> worlds, parent_location_id self FK, owner_id FK -> users); items (id PK, world_id FK -> worlds, location_id FK -> locations, owner_id FK -> users); session_events (id PK, session_id FK -> sessions, owner_id FK -> users); player_characters (id PK, world_id FK -> worlds, owner_id FK -> users); campaign_players (id PK, campaign_id FK -> campaigns, character_id FK -> player_characters, player_id FK -> users).
- Campi boolean is_visible_to_players per asset con visibilita pubblica/privata; session_events ha created_at.

## 9. Testing
- Strategia: JUnit 5 con @SpringBootTest + @AutoConfigureMockMvc, DB Postgres reale (replace = NONE), spring-security-test con helper per aggiungere l'header `Authorization: Bearer ...` generato via `JwtTokenService`.
- Classi chiave: AuthIntegrationTest; WorldCampaignSmokeTest; CampaignCrudIntegrationTest; NpcIntegrationTest; LocationIntegrationTest; ItemIntegrationTest; SessionEventIntegrationTest; PlayerCharacterIntegrationTest; CampaignPlayerIntegrationTest.
- Verifiche: status HTTP attesi (401/403/404/409), ruoli e ownership, visibilita pubblica, password BCrypt, conteggi liste, filtri gmNotes, flusso richiesta/approvazione campagne e protezioni sui duplicati/mismatch.

## 10. Estensioni future
- Frontend web/mobile per interfacciare le API (dashboard GM, view giocatori).
- Integrazione con mappe grafiche e immagini dei luoghi/NPC.
- Esportazione del log eventi di sessione (PDF/CSV) o notifiche push per i giocatori.
- Gestione inventario giocatori e legami con gli Item di world.
- Audit log avanzato e versioning di campagne/sessioni.
