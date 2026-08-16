# Financial Close Pack

Focused finance workflow for assembling, reviewing, signing off, and exporting a complete close pack. The UI is warm, editorial, and Mastercard-inspired without using Mastercard brand assets.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: FastAPI
- Persistence: SQLite + local file storage
- Deployment: Vercel frontend, Render backend
- Document operations: SuperDocs REST API (`SUPERDOCS_MODE=mock` by default)

## What is real

Everything the UI shows is backed by the API. Specifically:

- **Uploads** store real bytes; documents can be downloaded again.
- **Classification** is suggested from the filename and confirmed explicitly.
- **Generation** uploads the source documents to SuperDocs, asks for proposed edits, and
  creates the review queue from the response. Failures surface as a failed job with the
  error, not as a silent success.
- **Review decisions and sign-offs** are attributed to the authenticated session user.
- **The audit trail** is recorded server-side and is what the timeline renders.
- **Export** builds a real zip (manifest, generated PDF sheets, and the source documents)
  that the browser downloads.
- **The close gate** is enforced by the backend. A blocked close returns `409` with the
  blocker list and records a `CLOSE_BLOCKED` audit event.
- **A closed period is immutable.** Further mutations return `409`.

## Not yet integrated

Called out explicitly so nothing here reads as more finished than it is:

- **Clerk** — the app ships a demo session provider that issues a signed token for a single
  fixed identity. It is real authentication with real attribution, but it is not multi-user
  and there is no sign-up. Replace `POST /api/v1/auth/demo-session` with a Clerk token
  exchange before using this with real data.
- **Neon / Postgres** — persistence is SQLite via `DATABASE_URL=sqlite:///...`. A Postgres URL
  is rejected at startup with a clear error rather than silently ignored.
- **Cloudflare R2 / S3** — uploads and exports are written to `STORAGE_DIR` on local disk.
  `backend/app/services/storage.py` is the seam where an object-store backend would go.

## Local Setup

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

Frontend runs at `http://localhost:5180/`, backend at `http://localhost:8000`. The port is
set by `VITE_DEV_PORT` and must be present in the backend's `FRONTEND_ORIGIN`, or the browser
will block every API call.

On first boot the backend creates `var/close_pack.db` and seeds one demo close
(Acme India Pvt Ltd, March 2026) whose source documents are generated PDFs.

## Tests

```bash
npm test              # frontend + backend
npm run test:frontend
npm run test:backend
```

## Demo Flow

1. Sign in with the demo button.
2. Open the March 2026 close.
3. Confirm the mapping on the unclassified memo, or upload a new document.
4. Complete the remaining checklist items.
5. Generate the close pack and watch the staged job progress.
6. Approve or reject each proposed change.
7. Complete the outstanding sign-off.
8. Export the pack — the zip downloads.
9. Close the period. Until every gate dimension is satisfied the backend refuses.

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
