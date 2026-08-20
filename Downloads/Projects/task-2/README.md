# Financial Close Pack

Focused finance workflow for assembling, reviewing, signing off, and exporting a complete
close pack, driven end to end by the SuperDocs document operations contract. The UI is
warm, editorial, and Mastercard-inspired without using Mastercard brand assets.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI
- Persistence: SQLite + local file storage
- Deployment: Vercel frontend, Render backend
- Document operations: SuperDocs adapter (`SUPERDOCS_MODE=mock` by default)

## The SuperDocs contract

The close pack drives all four operations, in this order, and records every call:

| Step | Adapter method | Ledger name | When it runs |
| --- | --- | --- | --- |
| 1 | `upload_document` | `upload_document` | Generation, once per classified source document |
| 2 | `edit_document` | `send_edit_instruction` | Generation, once against the working document |
| 3 | `approve_changes` | `approve_changes` | Each time a reviewer approves a proposed change |
| 4 | `export_document` | `export_document` | Export, against the approved change set |

Both modes go through the same `SuperDocsClientProtocol`, the same call sites and the same
ledger. Mock mode changes the transport, not the sequence.

**The two exports are different things and the app keeps them apart:**

- **SuperDocs exported document** — what `export_document` returned: the finished file
  produced from the approved changes. It ships in the zip under `superdocs/`.
- **App close-pack archive (zip)** — the file of record a controller has to retain.
  SuperDocs exports *a document*; a close pack is *an evidence bundle*, so the app builds
  it: the SuperDocs export plus the source documents, the Supporting Memo, the checklist,
  the review decisions, the sign-off sheet, the audit trail and the SuperDocs operation
  ledger. Keeping only the SuperDocs file would discard the evidence that the close was
  performed correctly.

### Seeing the proof

`GET /api/v1/closes/{id}/superdocs` and the **SuperDocs** tab in the UI show, per close:
contract coverage for all four operations, and an append-only ledger of every call with
its operation, mode, timestamp, duration, document id, change ids, request id, and
success or failure with the error text. The same ledger ships inside every exported pack
at `superdocs/operation-ledger.json`.

No credentials are recorded. The API key never reaches the ledger, and every stored
SuperDocs response envelope is passed through a redactor that strips credential-shaped
fields and bulk content. There is a test that asserts a configured key appears in none of
the API responses, the database, or any file in the exported zip.

## What is real

Everything the UI shows is backed by the API. Specifically:

- **Uploads** store real bytes; documents can be downloaded again.
- **Classification** is suggested from the filename and confirmed explicitly.
- **Generation** uploads the source documents to SuperDocs, asks for proposed edits, and
  creates the review queue from the response. Failures surface as a failed job with the
  error, not as a silent success.
- **Approval calls SuperDocs first.** A proposed change is only marked APPROVED after
  `approve_changes` succeeds. If SuperDocs fails, the item stays PENDING with the error
  attached, the failure is written to the ledger and the audit trail, and the API returns
  `502 SUPERDOCS_APPROVAL_FAILED`. Rejection is deliberately local-only: a rejected change
  is never sent, so it can never reach the exported document.
- **Export calls SuperDocs first.** `export_document` runs against the approved change
  set; if it fails nothing is exported and the API returns `502 SUPERDOCS_EXPORT_FAILED`.
- **The Supporting Memo** (`Supporting Memo.pdf`) is a first-class generated artifact
  built from the uploaded source evidence. It is created when the pack is generated, is
  visible and downloadable on the Review and SuperDocs tabs, and is rebuilt at export time
  so the packaged copy reflects decisions made after generation.
- **Review decisions and sign-offs** are attributed to the authenticated session user.
- **The audit trail** is recorded server-side and is what the timeline renders.
- **Export** builds a real zip that the browser downloads.
- **The close gate** is enforced by the backend. A blocked close returns `409` with the
  blocker list and records a `CLOSE_BLOCKED` audit event.
- **A closed period is immutable.** Further mutations return `409`.
- **An export is invalidated** whenever the close changes underneath it, so a pack can
  never be filed against evidence it does not contain.

## Mock mode

`SUPERDOCS_MODE=mock` is the default and needs no API key or network access.

Mock mode is **not** a bypass. It implements the same protocol, is invoked from the same
call sites, and produces the same ledger entries as live mode. What it does *not* do is
talk to SuperDocs, so its proposed changes and exported bytes are synthetic — the exported
PDF says so on its first line.

Everything it returns is **deterministic**: ids and receipts are derived by hashing the
inputs, so the same close always produces the same change set, the same approval receipts
and byte-identical exported documents. There is a test that runs two identical closes and
asserts the results match exactly.

## Live mode

```env
SUPERDOCS_MODE=live
SUPERDOCS_API_KEY=sk_your_key
SUPERDOCS_BASE_URL=https://api.superdocs.com
```

`get_client()` then returns the real REST client, which calls `POST /documents`,
`POST /documents/{id}/edit`, `POST /documents/{id}/approve` and
`POST /documents/{id}/export` with a bearer token. A blank key in live mode is rejected at
client construction rather than producing silent 401s.

**Live mode has not been executed against the real SuperDocs API in this build.** The REST
paths and payload shapes are written to the documented contract and are exercised in tests
through the protocol, not against the live service. Treat live mode as wired and
type-correct, not as verified.

## Local setup

```bash
cp .env.example .env
npm --prefix frontend install
pip install -r backend/requirements.txt
```

Start the backend:

```bash
uvicorn backend.app.main:app --reload --port 8000
```

Start the frontend:

```bash
npm run dev
```

Frontend runs at `http://localhost:5180/`, backend at `http://localhost:8000`.

> **Frontend env vars live in `frontend/.env`, not the repo root.** Vite reads env files
> from its own project root, so `VITE_API_BASE_URL` in the root `.env` is ignored and the
> client falls back to `http://localhost:8000`. `VITE_DEV_PORT` is read from the process
> environment by `vite.config.ts`, so setting it in any `.env` file has no effect either;
> pass it inline (`VITE_DEV_PORT=5190 npm run dev`) or edit the config. Whatever port you
> use must be in the backend's `FRONTEND_ORIGIN` or the browser will block every API call.

On first boot the backend creates `var/close_pack.db` and seeds one demo close
(Acme India Pvt Ltd, March 2026) whose source documents are generated PDFs. Closes written
by an earlier build are backfilled with the SuperDocs fields on boot.

## Reviewer demo script

Roughly three minutes, entirely in mock mode, no credentials required. Delete `var/` first
for a pristine run.

1. **Sign in** with the demo button.
2. **Open the March 2026 close.** Eight source documents, five of seven checklist items
   done, two of three sign-offs collected. Readiness 54%.
3. **Documents tab** — every uploaded PDF is real and downloadable. `Revenue Memo.pdf`
   is unclassified; click **Confirm mapping**.
4. **Checklist tab** — complete *Revenue recognition* and *Accrual review*.
5. **Overview tab → Generate close pack.** The staged job runs
   `upload_document` ×8, then `send_edit_instruction`, and builds the review queue.
6. **Review tab** — the Supporting Memo now appears under *Generated artifacts*; open it.
   Three proposed changes are queued.
   - **Approve** one. The SuperDocs receipt (`approve_changes`, mode, change id, request
     id) appears under the item.
   - **Reject** one. No SuperDocs call is made; it will not reach the exported document.
   - Approve the third so the gate can clear.
7. **SuperDocs tab** — contract coverage now shows `upload_document`,
   `send_edit_instruction` and `approve_changes` exercised, with the full ledger beneath.
8. **Sign-offs tab** — approve the outstanding Controller sign-off.
9. **Final Pack tab → Export pack.** This calls `export_document`, then builds the zip.
   The panel lists the SuperDocs exported document and the app archive separately.
10. **SuperDocs tab** — coverage is now complete: all four operations exercised.
11. **Final Pack → Download pack.** The zip contains `Supporting Memo.pdf`,
    `superdocs/<document>-final.pdf`, `superdocs/export-metadata.json`,
    `superdocs/operation-ledger.json`, the five sheets, the manifest with contract
    coverage, and every source document.
12. **Close Period.** Succeeds only now that every gate dimension is satisfied.
13. **Try to edit after close** — approve a change, re-export or regenerate. All return
    `409` and the ledger gains no new entries.

To see the failure path, start the backend with an unreachable base URL in live mode and
try step 6: the item stays PENDING, the error is shown on the card, and the ledger records
a FAILED `approve_changes`.

## Tests

```bash
npm test              # frontend + backend
npm run test:frontend
npm run test:backend
```

91 backend tests and 15 frontend tests. The SuperDocs contract suite
(`backend/tests/test_superdocs_contract.py`, 29 tests) covers approval calling SuperDocs,
approval failure not producing false local success, export calling SuperDocs, the memo
being generated and packaged, the ledger recording all four operations, mock determinism,
and that a configured API key leaks into no surface.

## Known limitations

Called out explicitly so nothing here reads as more finished than it is:

- **Live SuperDocs is unverified.** See "Live mode" above. Everything demonstrable in this
  build runs through the mock adapter.
- **A live export that returns a URL instead of inline bytes is not fetched.** The
  reference is recorded in `superdocs/export-metadata.json` and the zip ships metadata
  only for that file. Mock mode returns inline bytes, so the demo path is complete.
- **Clerk** — the app ships a demo session provider that issues a signed token for a single
  fixed identity. It is real authentication with real attribution, but it is not multi-user
  and there is no sign-up. There is no sign-out control in the UI. Replace
  `POST /api/v1/auth/demo-session` with a Clerk token exchange before using this with real
  data.
- **Neon / Postgres** — persistence is SQLite via `DATABASE_URL=sqlite:///...`. A Postgres
  URL is rejected at startup with a clear error rather than silently ignored.
- **Cloudflare R2 / S3** — uploads and exports are written to `STORAGE_DIR` on local disk.
  `backend/app/services/storage.py` is the seam where an object-store backend would go.
- **The demo close ships two sign-offs already approved** by seeded teammates, representing
  work done before the reviewer arrives. They are synthetic, like the rest of the seed.
- **`created_by` on the seeded close renders as a Python dict** in the exported close
  summary PDF, because the seed passes a plain dict where the API passes a `Principal`.
  Cosmetic, and confined to the seeded close.
- **The audit timeline shows times without dates** and is capped at the last 12 events.
- **A generation abandoned by a crashed worker** is only released after
  `GENERATION_TIMEOUT_SECONDS` (default 900).

## Deployment

Vercel uses the root `vercel.json`. Render uses `render.yaml`, which mounts a disk so the
SQLite database and uploaded documents survive restarts.

Set on Vercel:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

Set on Render:

```env
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
SESSION_SECRET=<generated>
SUPERDOCS_MODE=mock
SUPERDOCS_API_KEY=
```

## Credit

Built for SuperDocs Task 2: Financial Close Pack.
