# CryptoCommunity Anonymous setup

This version replaces email/password participation with a separate Firebase Anonymous Auth session.

## Firebase setup
1. Enable **Authentication → Sign-in method → Anonymous** in Firebase Console.
2. Firestore must be enabled in the same Firebase project.
3. Test `firestore.rules` in the Firebase Emulator Suite, then publish the rules deliberately.
4. Keep the existing `VITE_FIREBASE_*` build variables configured.

## Community behavior
- No email address, password, Google sign-in, wallet connection, profile name, or phone number is requested for community participation.
- The community uses a separate Firebase app/auth instance and in-memory auth persistence. The anonymous session is cleared when the page/app session ends; a later visit may receive a new pseudonymous UID.
- Firebase still processes an anonymous UID and technical request metadata. This is pseudonymous participation, not guaranteed invisibility from Firebase, hosting providers, network operators, or lawful requests.
- The feed is one public stream of text comments (up to 500 characters), not user-created profiles, image posts, uploads, or private messages.
- Members choose from built-in fictional character names and emoji avatars. No avatar upload or user-supplied profile fields exist.
- Links and common sensitive-data patterns are blocked on the client and in Firestore rules. These checks are best effort and cannot detect every obfuscated identifier, harmful statement, or context-dependent personal detail.
- The old `communityPosts` collection is denied by the new rules. Existing records are not automatically erased; review and delete them separately if retention is not wanted.
- Public comments remain publicly readable. Do not write anything you would not want publicly visible.

## Security and operations
- Anonymous sign-in reduces password collection and password-reset risks, but it does not prevent spam, bots, harassment, abuse, or correlation of sessions.
- Consider Firebase App Check, rate limiting via a trusted backend, reporting/moderation workflows, and a privacy/legal review before public launch. App Check and text filters are not complete abuse prevention.
- Test all rules in the Firebase Emulator Suite before deployment. A repository commit does not deploy Firestore rules.
- Firebase free-tier quotas apply; usage beyond free allowances may require billing. Do not enable billing without reviewing costs.
