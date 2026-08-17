# Westone Full Stack — GitHub Pages + Render

جاهز للنشر: Frontend على GitHub Pages وBackend على Render.

## URLs
- Frontend: https://m-1ai.github.io/NLFq/
- Backend: https://westone-backend.onrender.com
- Health: https://westone-backend.onrender.com/api/health

## GitHub Pages
- ارفع محتويات المشروع إلى جذر المستودع.
- GitHub Pages يعمل من `main` عبر GitHub Actions.
- ملف الـ workflow موجود في `.github/workflows/pages.yml` ويقوم بنشر `frontend/` فقط.

## Render
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check: `/api/health`

## Environment Variables
```text
NODE_ENV=production
DATABASE_URL=<Render PostgreSQL connection string>
JWT_SECRET=<strong random secret>
SESSION_COOKIE_NAME=westone_session
FRONTEND_URL=https://m-1ai.github.io/NLFq/
DISCORD_CLIENT_ID=<Discord application client id>
DISCORD_CLIENT_SECRET=<Discord application client secret>
DISCORD_REDIRECT_URI=https://westone-backend.onrender.com/api/auth/discord/callback
ADMIN_DISCORD_IDS=<comma separated Discord user IDs>
```

## Discord Developer Portal
OAuth2 Redirect URL must be exactly:
`https://westone-backend.onrender.com/api/auth/discord/callback`

## Authentication flow
1. Frontend sends the user to Render `/api/auth/discord`.
2. Render redirects to Discord with a cryptographic OAuth state cookie.
3. Discord returns to Render callback.
4. Render validates state, exchanges the code, fetches the Discord identity, upserts the user, and signs a 30-day JWT.
5. Render redirects to GitHub Pages with a short-lived-in-URL bearer handoff.
6. Frontend stores the token in localStorage, removes it from the visible URL, then calls `/api/auth/me`.
7. All later API calls send both the bearer token and credentials, so the session survives refreshes and browser cookie policies.

## Important CORS detail
GitHub Pages project URLs contain a path (`/NLFq/`), but browser `Origin` is only `https://m-1ai.github.io`. The backend now derives CORS origins from `FRONTEND_URL`, so this deployment works correctly without manually changing the environment variable.
