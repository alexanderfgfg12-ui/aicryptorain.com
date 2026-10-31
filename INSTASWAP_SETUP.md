# InstaSwap setup for AI Crypto Rain

The swap screen is integrated but intentionally stays disabled until a real partner ID is configured.

1. Create a partner account at https://partners.instaswap.com.
2. In the partner dashboard, add `https://aicryptorain.com` and `https://www.aicryptorain.com` to the widget/API allowed domains if both hosts are used.
3. Copy the affiliate ID from the partner dashboard.
4. In the hosting provider's project/build environment, set `VITE_INSTASWAP_AFFILIATE_ID` to that ID, then trigger a new production build/deployment.
5. Verify a quote for a small amount before enabling public promotion. Always inspect the route, estimated output, network fees, minimum/maximum, recipient address, and refund address before creating a swap.

Do not commit the real ID to the repository. This Vite variable is public client configuration, not a secret; never put wallet seed phrases, private keys, or user credentials in it. The app must not create a swap until a real ID is configured and the user explicitly requests it.

InstaSwap's fees, routing, supported assets, and affiliate terms are controlled by InstaSwap and can change. Revenue is not guaranteed. This integration is non-custodial but users still face blockchain, address, liquidity, and counterparty/protocol risks.
