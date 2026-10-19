# AI Crypto Rain — Rebuild starter

A responsive Arabic-first (RTL), French and English crypto dashboard built with React, TypeScript, Vite, Firebase Authentication, public Binance market data, and the official Binance converter widget.

## What is implemented

- Responsive dark/gold UI with mobile navigation.
- Arabic / French / English UI strings and RTL/LTR direction switching.
- Public 24-hour Binance ticker data for selected assets, refreshed every 60 seconds.
- Searchable market table and browser-local watchlist.
- News list with HTTPS URL validation, safe React text rendering, and loading/error/empty states.
- Official Binance converter widget and configurable referral URL.
- Firebase email/password and Google sign-in UI (requires Firebase configuration).
- AI assistant UI that calls a configurable server-side endpoint only; no model API key is embedded in the browser.
- GitHub Actions build/deploy workflow for GitHub Pages.

## Important limitations

- The external news endpoint (`cryptocurrency.cv`) is retained as a provisional source and must be tested from the deployed site. It is not guaranteed.
- The AI assistant is not operational until you provide a secure HTTPS backend endpoint that accepts `{ "message": "...", "language": "ar|fr|en" }` and returns `{ "answer": "..." }`.
- GitHub Pages is static hosting; it cannot run a private API, server-side AI code, secure newsletter handler, or scheduled tasks. Host those functions separately (for example, Firebase Cloud Functions, Cloud Run, or another trusted backend).
- No wallet connection, exchange trading, investment recommendations, or real-money custody is implemented.
- Binance public API access can vary by region, rate limits, and CORS policies. Validate it from the target deployment.
- Firebase Auth is disabled gracefully until all required public client config values are set.

## Run locally

1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local`.
3. Set Firebase web app config values if using authentication.
4. Run:
   ```bash
   npm install
   npm run dev
   ```
5. Build:
   ```bash
   npm run build
   ```

## GitHub Pages deployment

1. Create a GitHub repository and push these files to its `main` branch.
2. In repository **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**.
3. In **Settings → Secrets and variables → Actions → Variables**, add:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_BINANCE_REFERRAL_URL`
   - `VITE_AI_API_URL` (only after you have a backend)
   - `VITE_BASE_PATH`: for a project repository use `/<REPOSITORY_NAME>/`; for `USERNAME.github.io` or a custom domain use `/`.
4. In Firebase Authentication settings, enable Email/Password and Google providers and add the final GitHub Pages hostname to Authorized domains.
5. Push to `main`; GitHub Actions builds and deploys `dist`.

## Security checklist before launch

- Firebase Firestore/Storage rules: deny by default, grant only user-owned access; do not rely on the client API key for authorization.
- Restrict the Firebase web API key to the Firebase APIs used by this app.
- Never store Gemini/OpenAI/service-account secrets in `VITE_*` variables; Vite variables are compiled into public client code.
- Add rate limits, request-size limits, authentication/authorization as needed, and abuse monitoring to the AI backend.
- Add consent/privacy text and double opt-in for newsletter collection; do not show success unless the backend confirms it.
- Add a verified server-side news proxy/cache if the news provider requires API credentials or has CORS/rate-limit issues.
- Verify affiliate terms and disclose the referral relationship clearly.
- Test keyboard navigation, screen readers, mobile layouts, network failure paths, and performance before launch.

## Next required inputs

- GitHub repository URL/name (for the correct `VITE_BASE_PATH`).
- Confirm the Firebase project and authorized deployment domain.
- Decide which server provider will host the AI API and newsletter backend.
- Confirm an approved Binance referral URL and the supported target countries.
