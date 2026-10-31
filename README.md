# AI Crypto Rain

A responsive Arabic-first (RTL) crypto market dashboard with French and English support. Built with React, TypeScript and Vite.

## Current site features

- Premium responsive dashboard with Arabic, French and English interface.
- Public Binance 24-hour market tickers refreshed every 60 seconds.
- Searchable market table and local watchlist.
- Market scanner for gainers, losers and trading-volume comparisons.
- Browser-local price alerts.
- Crypto news feed with HTTPS URL validation and safe text rendering.
- Official Binance converter widget and configurable referral link.
- InstaSwap walletless swap flow: live token catalogue, quote, fee breakdown, estimated settlement time, create order, deposit details and status lookup.
- Optional Firebase email/password and Google authentication.
- AI assistant UI connected only to a configurable server-side endpoint.

**CryptoCommunity is paused and is not part of the current site navigation or runtime.** Its Firebase anonymous-auth initialization has been removed from the active app. Community rules/tests remain in the repository as dormant work for a possible later restart.

## Important limitations

- InstaSwap swap creation is disabled until a valid partner ID is supplied through the build variable VITE_INSTASWAP_AFFILIATE_ID and the production domain is allow-listed in the InstaSwap Partners portal. The UI never fabricates a partner ID or reports a fake successful order.
- InstaSwap quotes and swaps depend on provider availability, supported pairs, current liquidity, network fees, and provider limits. Always verify addresses, networks, amount, and memo/tag before sending funds.
- The external news endpoint (cryptocurrency.cv) is provisional and may fail or change its response format.
- The AI assistant is not operational until VITE_AI_API_URL points to a secure HTTPS backend accepting a message, language, and market payload and returning an answer.
- GitHub Pages is static hosting. It cannot run private AI keys, webhooks, protected server APIs, secure newsletter handlers, or scheduled jobs. Host those services separately.
- Firebase authentication remains unavailable until all required Firebase web app configuration values are supplied and the sign-in providers/domains are enabled in Firebase Console.
- No wallet connection, trading terminal, investment advice, or custody of user funds is implemented by AI Crypto Rain.

## Local development

1. Install Node.js 20 or newer.
2. Copy .env.example to .env.local.
3. Add only public client configuration values required for the features you enable.
4. Run npm install and npm run dev.
5. Verify the production build with npm run build.

## GitHub Pages configuration

In Repository → Settings → Pages, set the deployment source to GitHub Actions.

In Settings → Secrets and variables → Actions → Variables, configure:

| Variable | Purpose |
| --- | --- |
| VITE_INSTASWAP_AFFILIATE_ID | Required to enable InstaSwap quotes and swap creation; obtain it from InstaSwap Partners and allow-list the site domain. |
| VITE_BINANCE_REFERRAL_URL | Optional Binance referral URL. |
| VITE_AI_API_URL | Optional HTTPS endpoint for a separately hosted AI backend. |
| VITE_FIREBASE_API_KEY | Firebase web app configuration. |
| VITE_FIREBASE_AUTH_DOMAIN | Firebase web app configuration. |
| VITE_FIREBASE_PROJECT_ID | Firebase web app configuration. |
| VITE_FIREBASE_STORAGE_BUCKET | Firebase web app configuration. |
| VITE_FIREBASE_MESSAGING_SENDER_ID | Firebase web app configuration. |
| VITE_FIREBASE_APP_ID | Firebase web app configuration. |

Firebase values may also be configured as Actions secrets. The deployment workflow accepts either repository variables or secrets for these values. The custom domain uses the root base path / and the CNAME file is copied into the production artifact.

After adding or changing a build variable, trigger a new deployment so Vite embeds the new value in the static bundle.

## Security and operational checklist

- Never put model API keys, Firebase service-account credentials, partner dashboard API keys, or webhook secrets in VITE_* variables. Vite embeds them in public JavaScript.
- Restrict the Firebase browser API key to the required APIs and configure Firebase Auth authorized domains.
- Keep Firestore and Storage rules deny-by-default and test changes in the Firebase Emulator Suite before publishing them.
- Add server-side rate limits, request-size limits, authentication and abuse monitoring to any AI backend.
- Do not claim an order, deposit, or AI answer succeeded unless the upstream service confirms it.
- Disclose referral relationships and follow provider terms.
- Test keyboard navigation, screen readers, mobile layouts, network failures, and accessibility before launch.

## Paused community work

The CryptoCommunity front-end is intentionally excluded from the active app. Firestore rules and emulator tests have been retained as dormant files; they are not run by the active CI workflow and are not deployed by the static website workflow. See CRYPTOCOMMUNITY_SETUP.md for archived notes; do not enable or publish that feature until it is deliberately resumed and reviewed.
