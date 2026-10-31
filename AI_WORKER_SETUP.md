# AI assistant Worker

This project uses a separate Cloudflare Worker so the browser never receives a provider API key.

## Deploy

1. In Cloudflare, enable Workers AI for the account and review its current pricing/limits.
2. Install Node.js, then run `npx wrangler login` from the repository.
3. Check `APP_ORIGINS` in `wrangler.toml`. Keep only the exact website origins you control.
4. Deploy with `npx wrangler deploy`.
5. Copy the deployed `https://…workers.dev` URL.
6. In the GitHub repository settings, add the Actions variable `VITE_AI_API_URL` with that URL (not a secret). Re-run the website deployment workflow.

The Worker uses the Workers AI binding and the `@cf/meta/llama-3.1-8b-instruct` model. The AI binding is configured in `wrangler.toml`; no model API key is placed in the frontend.

## Security before public launch

- Configure Cloudflare rate limiting/WAF rules for this Worker and set an appropriate usage budget/alert. CORS is an origin control, not authentication and not a substitute for rate limiting.
- Keep `APP_ORIGINS` restricted to your production domains.
- Review Workers AI usage charges and limits before enabling the endpoint for all visitors.
- The endpoint validates request size and message length, sends only a small public market snapshot, and returns generic errors without leaking provider details.
