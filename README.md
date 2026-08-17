# Westone — GitHub + Render Ready

## Structure
- `frontend/` — website frontend for GitHub Pages
- `backend/` — Node.js/Express API for Render
- `.github/workflows/pages.yml` — deploys `frontend/` to GitHub Pages
- `render.yaml` — Render Blueprint for backend + PostgreSQL

## GitHub Pages
1. Upload the contents of this folder to the root of your `M-1Ai/NLFq` repository.
2. GitHub → Settings → Pages → Source: **GitHub Actions**.
3. Push/commit to `main`.

Frontend API is already configured as:
`https://westone-backend.onrender.com`

## Render
Web service:
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Environment variables:
- `FRONTEND_URL=https://m-1ai.github.io/NLFq/`
- `DISCORD_REDIRECT_URI=https://westone-backend.onrender.com/api/auth/discord/callback`
- `DISCORD_CLIENT_ID=...`
- `DISCORD_CLIENT_SECRET=...`
- `ADMIN_DISCORD_IDS=...`

Do not commit real secrets.
