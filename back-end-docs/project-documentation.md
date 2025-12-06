# Documentazione del Progetto DD Manager

## 1. Introduzione e obiettivi
DD Manager e un backend Spring Boot 3 (Java 17) che supporta il Game Master (GM) nella gestione di campagne di gioco di ruolo stile D&D. Il sistema offre API REST per amministrare mondi, campagne, sessioni, NPC, luoghi, oggetti e log degli eventi di sessione, con controlli di sicurezza basati su ruoli e visibilita selettiva per i giocatori.

## 2. Panoramica architetturale
- Architettura a livelli: controller REST su /api/**, servizi applicativi, repository JPA, PostgreSQL come storage.
- Tecnologie: Java 17, Spring Boot 3, Spring MVC, Spring Security (HTTP Basic), Spring Data JPA, Maven, Lombok, Jakarta Validation.
- Struttura dei package: user (dto/model/repository/service/controller), world, campaign, session, npc, location, item, sessionlog, security, common/error, controller health.

## 3. Modello di dominio
- User: email (unique), password (BCrypt), nickname, ruoli (ROLE_ADMIN, ROLE_GM, ROLE_PLAYER, ROLE_VIEWER).
- Role: nome ruolo.
- World: id, name, description, owner (User); relazioni 1-N con Campaign, Npc, Location, Item.
- Campaign: id, name, description, status (enum), world (ManyToOne), owner (User); relazione 1-N con Session.
- Session: id, title, sessionNumber, sessionDate, notes, campaign (ManyToOne), owner (User); relazioni 1-N con SessionEvent.
- Npc: id, world (ManyToOne), owner (User), name, race, roleOrClass, description (pubblica), gmNotes (solo GM/Admin), isVisibleToPlayers (bool).
- Location: id, world (ManyToOne), parentLocation opzionale, owner (User), name, type, description, gmNotes, isVisibleToPlayers.
- Item: id, world (ManyToOne), location opzionale (ManyToOne), owner (User), name, type, rarity, description, gmNotes, isVisibleToPlayers.
- SessionEvent: id, session (ManyToOne), owner (User), title, type, description, inGameTime, isVisibleToPlayers, createdAt.
- Relazioni chiave: World 1-N Campaign; Campaign 1-N Session; Session 1-N SessionEvent; World 1-N Npc/Location/Item; Location puo avere parentLocation.

## 4. Gestione ruoli e sicurezza
- Ruoli: ROLE_ADMIN, ROLE_GM, ROLE_PLAYER, ROLE_VIEWER.
- Registrazione: campo role (PLAYER/DM/VIEWER) mappato su ROLE_PLAYER / ROLE_GM / ROLE_VIEWER; email univoca, password codificata con BCrypt.
- Autenticazione: HTTP Basic con credenziali email/password. Endpoint pubblici: POST /api/auth/register, POST /api/auth/login. Tutti gli altri endpoint richiedono autenticazione.
- Autorizzazioni: mutate su World/Campaign/Session/Npc/Location/Item/SessionEvent consentite solo a ADMIN o GM. PLAYER/VIEWER possono leggere ma vedono solo risorse con isVisibleToPlayers=true per NPC/Location/Item/SessionEvent. GM puo mutare solo le proprie risorse dove previsto, ADMIN ovunque.

## 5. Gestione errori
- Formato ApiError: timestamp, status, error, message, path.
- Mappature principali (GlobalExceptionHandler): InvalidCredentialsException -> 401; EmailAlreadyUsedException -> 409; InvalidRoleException -> 400; ResourceNotFoundException -> 404; UnauthorizedException/UsernameNotFoundException -> 401; AccessDeniedException -> 403; MethodArgumentNotValidException -> 400 con dettagli; eccezioni generiche -> 500 "Unexpected error".

## 6. Flussi principali
- Registrazione utente: POST /api/auth/register con email/password/nickname/role; assegna ruolo applicativo e salva password BCrypt.
- Login e utente corrente: POST /api/auth/login restituisce UserResponse; GET /api/auth/me ritorna l'utente autenticato; PUT /api/auth/me aggiorna nickname/password.
- World: POST /api/worlds (GM/ADMIN) crea mondo; GET /api/worlds/{id} elenca/mostra; PUT/DELETE /api/worlds/{id} con regole di ownership (GM owner, ADMIN sempre).
- Campaign: POST /api/campaigns (GM/ADMIN) su world esistente; GET lista/dettaglio; PUT/DELETE con controllo owner per GM.
- Session: POST /api/campaigns/{campaignId}/sessions (GM/ADMIN) crea sessione; GET lista per campagna.
- NPC: CRUD sotto /api/npcs; GET filtrati per visibilita; mutate solo GM/ADMIN.
- Location: CRUD sotto /api/locations; parentLocation opzionale; visibilita e gmNotes come NPC.
- Item: CRUD sotto /api/items con opzionale locationId; visibilita e gmNotes come NPC; mutate solo GM/ADMIN.
- SessionEvent: /api/session-events per mutate (GM/ADMIN); GET /api/sessions/{sessionId}/events restituisce timeline filtrata per ruolo.

## 7. Panoramica API (estratto)
- Auth: POST /api/auth/register (pubblico), POST /api/auth/login (pubblico), GET /api/auth/me, PUT /api/auth/me (auth).
- Worlds: GET /api/worlds, GET /api/worlds/{id} (auth), POST/PUT/DELETE /api/worlds/{id} (GM owner o ADMIN).
- Campaigns: GET /api/campaigns, GET /api/campaigns/{id}, GET /api/campaigns/world/{worldId} (auth); POST/PUT/DELETE /api/campaigns/{id} (GM owner o ADMIN).
- Sessions: GET /api/campaigns/{campaignId}/sessions (auth); POST /api/campaigns/{campaignId}/sessions (GM/ADMIN).
- NPC: GET /api/npcs, GET /api/npcs/{id}, GET /api/npcs/world/{worldId} (auth, filtro visibilita); POST/PUT/DELETE /api/npcs/{id?} (GM/ADMIN).
- Locations: GET /api/locations, GET /api/locations/{id}, GET /api/locations/world/{worldId} (auth, filtro visibilita); POST/PUT/DELETE /api/locations/{id?} (GM/ADMIN).
- Items: GET /api/items, GET /api/items/{id}, GET /api/items/world/{worldId} (auth, filtro visibilita); POST/PUT/DELETE /api/items/{id?} (GM/ADMIN).
- SessionEvents: GET /api/sessions/{sessionId}/events (auth, filtrato); POST /api/session-events, PUT /api/session-events/{id}, DELETE /api/session-events/{id} (GM/ADMIN).

## 8. Persistenza e schema dati
- Tabelle principali: users (id PK, email unique) con users_roles (user_id, role_id); roles (id PK, name unique); worlds (id PK, owner_id FK -> users); campaigns (id PK, world_id FK -> worlds, owner_id FK -> users); sessions (id PK, campaign_id FK -> campaigns, owner_id FK -> users); npcs (id PK, world_id FK -> worlds, owner_id FK -> users); locations (id PK, world_id FK -> worlds, parent_location_id self FK, owner_id FK -> users); items (id PK, world_id FK -> worlds, location_id FK -> locations, owner_id FK -> users); session_events (id PK, session_id FK -> sessions, owner_id FK -> users).
- Campi boolean is_visible_to_players per asset con visibilita pubblica/privata; session_events ha created_at.

## 9. Testing
- Strategia: JUnit 5 con @SpringBootTest + @AutoConfigureMockMvc, DB Postgres reale (replace = NONE), spring-security-test per httpBasic.
- Classi chiave: AuthIntegrationTest; WorldCampaignSmokeTest; CampaignCrudIntegrationTest; NpcIntegrationTest; LocationIntegrationTest; ItemIntegrationTest; SessionEventIntegrationTest.
- Verifiche: status HTTP attesi (401/403/404/409), ruoli e ownership, visibilita pubblica, password BCrypt, conteggi liste.

## 10. Estensioni future
- Frontend web/mobile per interfacciare le API (dashboard GM, view giocatori).
- Integrazione con mappe grafiche e immagini dei luoghi/NPC.
- Esportazione del log eventi di sessione (PDF/CSV) o notifiche push per i giocatori.
- Gestione inventario giocatori e legami con gli Item di world.
- Audit log avanzato e versioning di campagne/sessioni.
