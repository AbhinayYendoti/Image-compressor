# PROGRESS

## Phase 1-3 — scaffold and UI

- Created React + TypeScript Vite frontend scaffold.
- Created FastAPI backend scaffold.
- Added `.env.example` and local `.env` placeholders.
- Added Vercel and Render deployment configuration.
- Implemented Mastercard-inspired warm cream UI with a custom CloseOrbit logo.

## Phase 4 — audit remediation

An audit found the frontend and backend were two disconnected mockups with contradictory
fake data. The visual design was kept as-is; everything behind it was rebuilt.

### Data integrity

- Item ids are uuids and every route is scoped to one close. Decisions previously leaked
  across closes because seeded ids (`d1`, `c1`, `s3`) collided and handlers searched all closes.
- `create_close` builds from a template instead of cloning a fixture that arrived with two
  sign-offs already approved by people who had never seen the close.
- Readiness guards every ratio; a close with an empty section used to raise
  `ZeroDivisionError`.
- Sessions are signed tokens; the actor comes from the token, never the request body.
  Every handler used to hardcode `actor="Abhinay"`.
- A closed period is immutable.
- Persistence moved from a module-level dict to SQLite, so state survives restarts and is
  shared across workers.

### Features that now work

- Real multipart upload to disk, with download and sha256.
- Filename-based classification, confirmed explicitly through the mapping endpoint.
- Generation calls SuperDocs (mock or live) and builds the review queue from the response.
- Export assembles a downloadable zip of generated PDF sheets plus the source documents.
- The audit trail is exposed by `GET /closes/{id}/audit` and drives the timeline, which
  previously rendered five hardcoded strings.
- The close gate is enforced server-side.

### Wiring

- Added the frontend API client. There was previously no `fetch` call anywhere in `src/`.
- Dev port unified on 5180 across `vite.config.ts`, the npm script, and backend CORS.
- `FRONTEND_ORIGIN` documented; phantom Clerk/S3 settings removed.

### Tests

- 48 backend tests (endpoint, workflow, and a regression per audit finding).
- 11 frontend tests covering the readiness view model and formatting helpers.
