/**
 * Conservative client-side guard for sensitive data in public community text.
 * This is a safety layer, not a guarantee or a substitute for human moderation.
 */
export type ModerationResult = { allowed: true } | { allowed: false; reason: 'sensitive' }

const sensitivePatterns: RegExp[] = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, // email address
  /(?:\+?\d[\d\s().-]{7,}\d)/, // phone-like number
  /\b(?:\d[ -]*?){13,19}\b/, // payment-card-like number
  /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/i, // IBAN
  /\b0x[a-f0-9]{40}\b/i, // EVM wallet address
  /\b[5KL][1-9A-HJ-NP-Za-km-z]{ key }\b/i, // placeholder replaced below
  /\b[a-f0-9]{64}\b/i, // private-key-like hex
  /\b(?:password|passphrase|private key|secret key|seed phrase|recovery phrase|mnemonic|otp|one[- ]time code|cvv|cvc|رقم سري|كلمة المرور|كلمة السر|المفتاح الخاص|عبارة الاسترداد|عبارة الاسترجاع|رمز التحقق|الرقم السري|رقم البطاقة|الحساب البنكي|رقم الحساب|رقم الهوية|جواز السفر|البطاقة الوطنية)\b/i,
  /\b(?:my balance is|my salary is|my bank balance|رصيدي هو|راتبي هو|حسابي البنكي هو)\b/i,
]

export function checkCommunityText(value: string): ModerationResult {
  const text = value.normalize('NFKC')
  // Match common Bitcoin WIF private-key lengths without matching ordinary words.
  const bitcoinPrivateKey = /\b[5KL][1-9A-HJ-NP-Za-km-z]{50,51}\b/
  if (sensitivePatterns.some(pattern => pattern.test(text)) || bitcoinPrivateKey.test(text)) {
    return { allowed: false, reason: 'sensitive' }
  }
  return { allowed: true }
}
