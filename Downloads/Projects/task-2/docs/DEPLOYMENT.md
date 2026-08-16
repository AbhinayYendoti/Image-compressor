# Deployment

## Vercel Frontend

1. Import this repository in Vercel.
2. Keep the project root as the repository root.
3. Vercel will use `vercel.json`.
4. Add environment variables:

```env
VITE_API_BASE_URL=https://your-render-service.onrender.com
```

## Render Backend

1. Create a Blueprint from `render.yaml`, or create a Web Service manually.
2. Root directory: `backend`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Required environment variables

```env
FRONTEND_ORIGIN=https://your-vercel-app.vercel.app
SESSION_SECRET=<a long random string>
DATABASE_URL=sqlite:////var/data/close_pack.db
STORAGE_DIR=/var/data/storage
SUPERDOCS_MODE=mock
```

`FRONTEND_ORIGIN` must exactly match the deployed frontend origin, scheme included.
It is the CORS allowlist; if it is wrong every browser request fails before it reaches
a route. Use `ADDITIONAL_CORS_ORIGINS` (comma separated) for preview domains.

`SESSION_SECRET` must be set explicitly. Left blank, each instance generates its own
secret under `STORAGE_DIR`, and tokens issued by one instance are rejected by another.

### Persistence

`render.yaml` mounts a 1GB disk at `/var/data`. The SQLite database, uploaded documents,
and exported packs all live there. **Without a mounted disk they are on ephemeral storage
and are destroyed on every restart and redeploy.**

Because SQLite is single-writer, run this service with one instance. Multiple Render
instances would each need their own disk and would diverge.

## Going live with SuperDocs

`SUPERDOCS_MODE=mock` runs entirely offline and is the right setting for review and demo
deployments. To use the real API:

```env
SUPERDOCS_MODE=live
SUPERDOCS_API_KEY=<key>
SUPERDOCS_BASE_URL=https://api.superdocs.com
```

`SUPERDOCS_BASE_URL` is a placeholder default and should be set to the documented endpoint
for your account. In `live` mode a missing key fails fast at generation time with a clear
error rather than producing empty 401s.

## Before real data

The demo session provider (`POST /api/v1/auth/demo-session`) issues a token for one fixed
identity and requires no credentials. Replace it with a real identity provider before this
handles anything confidential. See "Not yet integrated" in the README.
