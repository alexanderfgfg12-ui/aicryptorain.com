# CryptoCommunity Anonymous setup

This version replaces email/password participation with a separate Firebase Anonymous Auth session.

## Firebase setup
1. Enable **Authentication → Sign-in method → Anonymous** in Firebase Console.
2. Firestore must be enabled in the same Firebase project.
3. Run `npm install` then `npm run test:rules` to test `firestore.rules` against the local Firebase Emulator Suite. GitHub Actions runs this test on branch pushes and pull requests targeting `main`.
4. Only after the emulator suite passes, publish the rules deliberately with `firebase deploy --only firestore:rules` from an authorized local environment.
5. Keep the existing `VITE_FIREBASE_*` build variables configured.

## Community behavior
- No email address, password, Google sign-in, wallet connection, profile name, or phone number is requested for community participation.
- The community uses a separate Firebase app/auth instance and in-memory auth persistence. The anonymous session is cleared when the page/app session ends; a later visit may receive a new pseudonymous UID.
- Firebase still processes an anonymous UID and technical request metadata. This is pseudonymous participation, not guaranteed invisibility from Firebase, hosting providers, network operators, or lawful requests.
- The feed is one public stream of text comments (up to 500 characters), not user-created profiles, image posts, uploads, or private messages.
- Members choose from built-in fictional character names and emoji avatars. No avatar upload or user-supplied profile fields exist. Public message documents contain no author UID; ownership metadata lives in a separate collection denied to public reads.
- The delete-own-comment control is available for messages created during the current mounted page session. After a reload, users can report a message; project operators can remove it through Firebase Console.
- Links and common sensitive-data patterns are blocked on the client and in Firestore rules. Members can report comments using a fixed reason; reports are private to the project operators and contain no free-text reporter input. Authors can delete their own comments.
- The client applies a small per-session posting cooldown as a usability/anti-spam friction only; it is not a security boundary and can be bypassed. Strong rate limiting requires a trusted backend or App Check-aware enforcement. These checks are best effort and cannot detect every obfuscated identifier, harmful statement, or context-dependent personal detail.
- The old `communityPosts` collection is denied by the new rules. Existing records are not automatically erased; review and delete them separately if retention is not wanted.
- Public comments remain publicly readable. Do not write anything you would not want publicly visible.

## Security and operations
- Important: the community Firestore instance is initialized from the same named Firebase app as the anonymous Auth instance, so Firestore requests carry the anonymous user's auth token. Do not switch this back to the main site's default app.
- Anonymous sign-in reduces password collection and password-reset risks, but it does not prevent spam, bots, harassment, abuse, or correlation of sessions.
- Enable Firebase App Check after testing its provider configuration, and review the private `communityReports` collection regularly in the Firebase console. A trusted backend is needed for enforceable rate limits, automated report triage, moderator roles, and bans. Complete a privacy/legal review before public launch. App Check and text filters are not complete abuse prevention.
- Test all rules in the Firebase Emulator Suite before deployment. Run `npm run test:rules` locally. A repository commit does not deploy Firestore rules.
- Firebase free-tier quotas apply; usage beyond free allowances may require billing. Do not enable billing without reviewing costs.


## Operator moderation checklist
1. Review new documents in `communityReports` in the Firebase console.
2. Open the referenced `communityMessages/{messageId}` document and assess it against the published community rules.
3. Remove harmful messages from the console; keep a minimal incident log only as long as operationally necessary.
4. If abuse is recurring, add a trusted moderation backend with moderator-only claims and server-enforced rate limits before adding bans or automated deletion.
5. Publish a contact/reporting channel and clear retention/deletion policy before inviting the public.
