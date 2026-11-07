# InstaSwap widget setup for AI Crypto Rain

The official InstaSwap widget is embedded directly in the dashboard and the dedicated InstaSwap navigation page using the provider's static widget mode.

1. In the InstaSwap Partners portal, make sure the affiliate ID used by the site is active.
2. Allow-list both `https://aicryptorain.com` and `https://www.aicryptorain.com` if both hostnames are used.
3. The site reads `VITE_INSTASWAP_AFFILIATE_ID` at build time. If it is not set, the existing public partner ID `0X0PUTVJ` is used as a fallback.
4. Deploy the site and test the embedded widget on desktop and mobile. If it does not load, verify the partner ID, domain allow-list and browser network restrictions.

The widget is loaded from `https://web.instaswap.com/widget.js` and initialized with `type: "static"` so the conversion interface appears inside the page rather than as a floating launcher. The widget is operated by InstaSwap; its available assets, routes, fees and terms may change.

The affiliate ID is public client configuration, not a secret. Never place wallet seed phrases, private keys or user credentials in the repository or build variables. Users review and confirm swaps directly through InstaSwap; AI Crypto Rain does not connect to wallets or execute transactions on a user's behalf.
