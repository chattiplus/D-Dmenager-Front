# Dev Log

## Overview
Goal: tracciare l'evoluzione di D&D Manager (Spring Boot 3 / Java 17, PostgreSQL) con sicurezza basata su ruoli.

## Task 0 - Setup iniziale
- Creato progetto Maven Spring Boot 3 con dipendenze web, data JPA, security, validation, Lombok e driver PostgreSQL.
- Configurato application.yml (Postgres locale, porta 8080, ddl-auto update, SQL formattato) e creata main class DdManagerApplication.
- Definite entity Role e User con repository; seed dei ruoli di default tramite DataInitializer.

## Task 1 - Health check REST
- Aggiunto HealthController (GET /api/health) che restituisce stato e timestamp.

## Task 2 - Registrazione utente e sicurezza HTTP Basic
- Creati DTO RegisterRequest e UserResponse e implementato UserService con hashing password e ruolo default ROLE_PLAYER.
- Introdotto UserPrincipal come UserDetails, SecurityConfig per HTTP Basic con /api/auth/register aperto e resto autenticato, aggiunto AuthController per registrazione.

## Task 3 - World / Campaign / Session (bozza dominio)
- Create entity JPA World, Campaign (enum CampaignStatus), Session con relazioni World -> Campaign -> Session.
- Creati repository dedicati e DTO request/response; servizi per create e read; controller REST: /api/worlds, /api/campaigns, /api/campaigns/{campaignId}/sessions.
- Endpoint di creazione protetti con @PreAuthorize("hasAnyRole('ADMIN','GM')"); abilitato @EnableMethodSecurity.

## Task 4 - Login e ownership
- Aggiunto DTO LoginRequest, endpoint /api/auth/login e GET /api/auth/me basato su CurrentUserService.
- Esteso World/Campaign/Session con owner opzionale e DTO arricchiti (id/nickname owner, campaignCount per world). Gestione errori centralizzata con ApiError, RestAuthenticationEntryPoint e RestAccessDeniedHandler per risposte 401/403 JSON.

## Task 5 - Ruolo in registrazione e test base
- RegisterRequest include il campo role (PLAYER->ROLE_PLAYER, DM->ROLE_GM, VIEWER->ROLE_VIEWER) con InvalidRoleException 400 e EmailAlreadyUsedException 409.
- Aggiornati test AuthIntegrationTest e WorldCampaignSmokeTest per coprire ruoli, login e chiamate world/campaign con utenti GM.

## Task 6 - Allineamento a Repository Guidelines
- Spostati tutti i controller nei package */controller (Auth, Health, World, Campaign, Session, AuthDebug) secondo la struttura DDD.
- Consolidate le eccezioni condivise (InvalidCredentials, EmailAlreadyUsed, InvalidRole, ResourceNotFound, Unauthorized) sotto common e aggiornato GlobalExceptionHandler ai codici previsti (400/401/403/404/409/500).
- UserService.authenticate ora restituisce 404 se l'email non esiste e 401 se la password non coincide; mantenuta la mappatura ruoli richiesta per la registrazione.
- WorldResponse, CampaignResponse, SessionResponse espongono id/nickname owner e campaignCount; CampaignService impedisce nomi duplicati nello stesso world con 400.
- Estesi i test di integrazione: 404 per login con email mancante, 409 per registrazione duplicata, 401/403 per accessi non autorizzati a world/campaign/session, verificando ownership e campi aggiuntivi nelle response.

## Task 7 - NPC module
- Aggiunto dominio NPC con entity collegata a World e User, visibilita per giocatori (campo isVisibleToPlayers) e note GM riservate.
- Creati DTO request/response con mapper differenziati GM vs player, repository dedicato e service che applica regole di visibilita e ruoli GM/ADMIN su mutate.
- Nuovo controller /api/npcs con CRUD protetto per GM/ADMIN e GET filtrati per PLAYER/VIEWER; integrazione con CurrentUserService ed errori standard.
- Test di integrazione NPC per creazione/lista GM, visibilita lato player (no gmNotes, 404 su NPC nascosto), visibilita completa lato GM e blocco operazioni di create/delete per player.

## Task 8 - Location module
- Introdotto dominio Location con relazione a World, owner e opzionale parent location, campi descrizione pubblica e gmNotes riservate.
- Creati DTO request/response con mapper per GM e player, repository e service che applica regole di visibilita e permessi (GM/ADMIN per mutate, 404 per contenuti nascosti ai player).
- Nuovo controller /api/locations con CRUD protetto e GET filtrati per ruolo; supporto al filtro per world.
- Test di integrazione Location: creazione/lista lato GM, visibilita player solo su location pubbliche (gmNotes nascosti, 404 su location nascoste), visibilita completa lato GM e blocco create/delete per player.

## Task 9 - CRUD alignment World/Campaign/User
- Aggiunti PUT
- /DELETE per World con regole di ownership (GM solo owner, ADMIN ovunque) e stessa protezione di sicurezza; aggiornati test world per update/delete e divieti per player.
- Aggiunti PUT/DELETE per Campaign con controllo owner/ruoli e validazione nome per world; nuovi test per update/delete GM e blocco player.
- Introdotto endpoint PUT /api/auth/me con DTO UserUpdateRequest per aggiornare nickname/password (senza toccare email/ruoli); test su nickname e password (BCrypt) aggiornati in AuthIntegrationTest.
- Aggiornato README con i nuovi endpoint CRUD e il profilo update.

## Task 10 - Session Event Log / Timeline
- Aggiunto dominio SessionEvent con timestamp, visibilita e collegamento a Session/owner; mapper GM/player.
- Creati DTO request/response, repository e service con filtri di visibilita (player/viewer vedono solo eventi pubblici) e mutate riservate a GM/ADMIN.
- Controller /api/sessions/{sessionId}/events (GET filtrato) e /api/session-events (POST/PUT/DELETE protetti).
- Test di integrazione: creazione/lista eventi lato GM, filtraggio per player (solo visibili), visibilita completa lato GM, blocco create/delete per player.

## Task 11 - Item module
- Introdotto dominio Item collegato a World, owner e opzionale Location con campi type, rarity, description, gmNotes e isVisibleToPlayers.
- Creati DTO request/response con mapper separati GM vs player, repository dedicato e service con filtri di visibilita e mutate limitate a GM/ADMIN; nuovo controller /api/items con GET filtrati per ruolo.
- Aggiunti test di integrazione per creazione/lista GM, visibilita player (gmNotes nascosti e 404 su item nascosti), visibilita completa GM e divieto di create/delete per player; aggiornati README, documentazione e Postman con le nuove API.
