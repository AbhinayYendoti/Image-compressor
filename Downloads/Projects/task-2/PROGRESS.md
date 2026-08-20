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

## Phase 5 — the SuperDocs contract, end to end

Phase 4 made the app real but drove SuperDocs only during generation. Approval and export
were local state changes dressed up as document operations. Phase 5 put the whole contract
on the critical path.

### All four operations are now on the critical path

- `upload_document` and `send_edit_instruction` run during generation, as before.
- `approve_changes` now runs *before* an item is marked APPROVED. If SuperDocs fails the
  item stays PENDING with the error attached and the API returns
  `502 SUPERDOCS_APPROVAL_FAILED`, so a local success can never be faked.
- Rejection stays deliberately local-only — a rejected change is never sent, so it cannot
  reach the exported document.
- `export_document` now runs against the approved change set before the zip is assembled.
  A failure exports nothing and returns `502 SUPERDOCS_EXPORT_FAILED`.

### The operation ledger

- `services/superdocs_ops.py` records every adapter call — operation, mode, timestamp,
  duration, document and change ids, request id, success or failure with error text —
  against the close that caused it, in both modes.
- Exposed by `GET /closes/{id}/superdocs` and the SuperDocs tab, which also shows contract
  coverage across the four operations.
- Shipped inside every exported pack at `superdocs/operation-ledger.json`.
- Every stored response envelope passes through a redactor. A test asserts a configured
  API key appears in no API response, no database row, and no file in the exported zip.

### The Supporting Memo

- `services/memo.py` builds `Supporting Memo.pdf` from the uploaded source evidence: what
  was provided, what the checklist attests to, what SuperDocs proposed, how each proposal
  was decided, and who signed.
- Generated with the pack so it is visible immediately, and rebuilt at export so the
  packaged copy reflects decisions made after generation.

### Export integrity

- The app archive and the SuperDocs exported document are kept distinct: SuperDocs exports
  *a document*, the close pack is *an evidence bundle*, and the zip carries both.
- An export is invalidated whenever the close changes underneath it, so a pack can never
  be filed against evidence it does not contain.
- A generation abandoned by a crashed worker is released after `GENERATION_TIMEOUT_SECONDS`
  (default 900) instead of wedging the close forever.

### Tests

- 91 backend tests and 15 frontend tests, all passing; `npm run build` is clean.
- `test_superdocs_contract.py` (29 tests) covers approval calling SuperDocs, approval
  failure not producing false local success, export calling SuperDocs, memo generation and
  packaging, the ledger recording all four operations, mock determinism across two
  identical closes, and API-key non-leakage.
- `test_export_freshness.py` and `test_generation_recovery.py` cover export invalidation
  and abandoned-generation recovery.

### Not done

- Live mode has never been executed against the real SuperDocs API. It is wired and
  type-correct, not verified.
- A live export returning a URL instead of inline bytes is recorded as a reference in
  `superdocs/export-metadata.json` but not fetched into the zip.
- Clerk, Postgres and object storage remain the seams described in the README's
  "Known limitations".
