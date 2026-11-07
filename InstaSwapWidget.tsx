type Props = { lang: 'ar' | 'fr' | 'en' }

const officialUrl = 'https://app.instaswap.com'

export default function InstaSwapWidget({ lang }: Props) {
  const copy = {
    ar: {
      eyebrow: 'InstaSwap · المنصة الرسمية',
      title: 'أكمل التحويل على InstaSwap',
      description: 'تبدأ تجربة التحويل هنا، لكن اختيار الأصول وإدخال بيانات العملية ومراجعة السعر والتأكيد تتم على موقع InstaSwap الرسمي.',
      from: 'ترسل',
      to: 'تستلم',
      amount: 'مثال على زوج التحويل',
      button: 'Swap على InstaSwap',
      note: 'سيتم فتح موقع InstaSwap الرسمي. لن ينفذ aicryptorain أي تحويل ولن يطلب بيانات المحفظة.',
    },
    fr: {
      eyebrow: 'InstaSwap · plateforme officielle',
      title: 'Terminez votre échange sur InstaSwap',
      description: 'La suite du parcours — choix des actifs, détails de la transaction, vérification du taux et confirmation — se déroule sur le site officiel InstaSwap.',
      from: 'Vous envoyez',
      to: 'Vous recevez',
      amount: 'Exemple de paire',
      button: 'Swap sur InstaSwap',
      note: 'Le site officiel InstaSwap va s’ouvrir. AI Crypto Rain n’exécute aucun échange et ne demande aucune donnée de portefeuille.',
    },
    en: {
      eyebrow: 'InstaSwap · Official platform',
      title: 'Complete your swap on InstaSwap',
      description: 'Continue to the official InstaSwap website to choose assets, enter transaction details, review the quote and confirm the swap.',
      from: 'You send',
      to: 'You receive',
      amount: 'Example pair',
      button: 'Swap on InstaSwap',
      note: 'The official InstaSwap website will open. AI Crypto Rain does not execute swaps or request wallet details.',
    },
  }[lang]

  return (
    <section className="instaswap-embed-shell" aria-label="InstaSwap official swap">
      <div className="instaswap-official-card">
        <div className="instaswap-official-heading">
          <span className="instaswap-official-mark" aria-hidden="true">↗</span>
          <div>
            <span className="instaswap-official-eyebrow">{copy.eyebrow}</span>
            <h3>{copy.title}</h3>
          </div>
        </div>
        <p className="instaswap-official-description">{copy.description}</p>
        <div className="instaswap-pair-preview">
          <div className="instaswap-asset-preview">
            <small>{copy.from}</small>
            <strong><span aria-hidden="true">₿</span> BTC</strong>
          </div>
          <span className="instaswap-pair-arrow" aria-hidden="true">⇄</span>
          <div className="instaswap-asset-preview">
            <small>{copy.to}</small>
            <strong><span aria-hidden="true">◆</span> ETH</strong>
          </div>
        </div>
        <a
          className="instaswap-official-button"
          href={officialUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {copy.button}
          <span aria-hidden="true">↗</span>
        </a>
        <p className="instaswap-official-note">{copy.note}</p>
      </div>
    </section>
  )
}
