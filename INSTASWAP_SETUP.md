# InstaSwap official-site handoff for AI Crypto Rain

AI Crypto Rain displays a branded handoff card for InstaSwap. The conversion flow itself is completed on the official InstaSwap website.

## Current behavior

1. The dashboard and dedicated Swap page show the InstaSwap handoff card.
2. The **Swap on InstaSwap** link opens `https://app.instaswap.com` in a new tab.
3. Asset selection, quote review, transaction details, and confirmation are handled on InstaSwap.
4. AI Crypto Rain does not load the embedded `widget.js`, request wallet credentials, connect to a wallet, create swap orders, or execute transactions.

## Domain and DNS

The link opens the official InstaSwap application directly. The site's DNS records do not proxy or operate the provider's swap application. Keep the existing DNS records unchanged unless InstaSwap explicitly instructs otherwise.

## Affiliate attribution

The former embedded widget used affiliate ID `0X0PUTVJ`. That ID is not automatically attached to the plain official-app URL. If referral attribution is required, obtain the official referral/deep link from the InstaSwap Partners Dashboard and replace the `officialUrl` constant in `InstaSwapWidget.tsx` with that exact provider-issued URL. Do not invent query parameters.

## Safety

Never add wallet seed phrases, private keys, or user credentials to this repository. Users should verify the domain is `app.instaswap.com` before entering transaction information.
