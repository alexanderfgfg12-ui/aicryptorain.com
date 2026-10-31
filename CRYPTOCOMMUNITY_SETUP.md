# CryptoCommunity setup

CryptoCommunity uses the Firebase project already configured by the app. It does not require wallet connection or paid third-party services.

## Firebase setup
1. In Firebase Console, enable **Authentication → Email/Password**.
2. In Authentication settings, add `aicryptorain.com` and `www.aicryptorain.com` to authorized domains.
3. Create/enable **Cloud Firestore** in the same Firebase project.
4. Publish the repository's `firestore.rules` rules in Firestore → Rules. These rules allow public reading but require a verified Firebase email for creating posts and comments.
5. Confirm the existing `VITE_FIREBASE_*` environment variables are configured in the hosting build environment.

## Behavior
- Visitors can read the public feed.
- Signed-in users must have `emailVerified === true` to publish or comment.
- Signup sends a Firebase verification email. Unverified users can request another email from the community page.
- Posts and comments are public. The app deliberately does not publish email addresses or wallet addresses.
- The feed shows the latest 40 posts; each expanded comment thread loads up to 30 comments.

## Important
Firestore has free-tier quotas and usage limits. This feature is designed to use Firebase's existing free allowances, but usage beyond the project's quota may require a billing plan. Do not enable billing without reviewing the cost implications.
