# CryptoCommunity setup

CryptoCommunity uses the Firebase project already configured by the app. It does not require wallet connection or paid third-party services.

## Firebase setup
1. In Firebase Console, enable **Authentication → Email/Password**.
2. In Authentication settings, add `aicryptorain.com` and `www.aicryptorain.com` to authorized domains.
3. Create/enable **Cloud Firestore** in the same Firebase project.
4. Publish the repository's `firestore.rules` rules in Firestore → Rules. These rules allow public reading but require a verified Firebase email for creating posts and comments.
5. Confirm the existing `VITE_FIREBASE_*` environment variables are configured in the hosting build environment.
6. Deploy the updated `firestore.rules` only after testing them in the Firebase Emulator Suite. The repository change does not publish rules to Firebase automatically.

## Behavior
- Visitors can read the public feed.
- Signed-in users must have `emailVerified === true` to publish or comment.
- Signup sends a Firebase verification email. Unverified users can request another email from the community page.
- Posts and comments are public. Never publish personal contact details, identity documents/numbers, bank or payment-card details, passwords, OTPs, seed/recovery phrases, private keys, wallet addresses, private balances, or private transaction/account information.
- The composer applies a client-side sensitive-data filter, and Firestore rules independently reject several common patterns on direct writes. Both are best-effort filters: they can miss obfuscated, encoded, image-based, or unusual formats and can occasionally flag harmless text. There is no reliable way for simple text rules to identify every kind of sensitive or harmful content.
- Do not add image/file uploads or private-message features without a separate security and moderation design.
- The feed shows the latest 40 posts; each expanded comment thread loads up to 30 comments.

## Important
Firestore has free-tier quotas and usage limits. This feature is designed to use Firebase's existing free allowances, but usage beyond the project's quota may require a billing plan. Do not enable billing without reviewing the cost implications.

## Moderation and privacy policy

Content containing personal identifiers, contact details, financial-account or payment details, authentication credentials, recovery phrases, private keys, wallet addresses, or private financial information is prohibited. Also prohibit doxxing, threats, harassment, hate speech, illegal offers, impersonation, scams, malware links, and spam. Provide a report-and-review process and moderator removal tools before opening the feed to the public. Automated pattern checks are only a first barrier; human review and abuse handling remain necessary.

**Important limitation:** these code changes do not guarantee that all sensitive content will be detected, do not scan images or links, do not delete existing posts, and do not take effect in Firebase until the Firestore rules are tested and deployed by an authorized project administrator.
