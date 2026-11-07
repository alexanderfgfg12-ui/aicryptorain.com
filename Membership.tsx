import { BadgeCheck, CircleUserRound, ShieldCheck, Sparkles } from 'lucide-react'

type Props = { lang: 'ar' | 'fr' | 'en' }

const text = {
  ar: {
    title: 'العضوية', subtitle: 'استخدم المنصة مباشرة دون تسجيل أو إنشاء حساب.',
    free: 'وصول مجاني', current: 'حالة الوصول', price: '0 — بدون رسوم',
    features: ['أسعار العملات ومتابعة السوق', 'ماسح السوق', 'قائمة العملات المفضلة على هذا الجهاز', 'تنبيهات الأسعار المحلية', 'الأخبار ومحتوى التوعية', 'مساعد الذكاء الاصطناعي وInstaSwap'],
    guest: 'تتصفح كزائر — لا يلزم حساب',
    noPaid: 'لا توجد مدفوعات أو تجديد تلقائي أو اشتراكات مدفوعة مفعّلة.',
    privacy: 'تُحفظ قائمة المتابعة والتنبيهات محلياً في متصفحك.',
  },
  fr: {
    title: 'Accès', subtitle: 'Utilisez la plateforme directement, sans inscription ni compte.',
    free: 'Accès gratuit', current: 'Statut d’accès', price: '0 — sans frais',
    features: ['Prix des cryptomonnaies et suivi du marché', 'Scanner de marché', 'Liste de suivi sur cet appareil', 'Alertes de prix locales', 'Actualités et contenu éducatif', 'Assistant IA et InstaSwap'],
    guest: 'Navigation en invité — aucun compte requis',
    noPaid: 'Aucun paiement, renouvellement automatique ou abonnement payant n’est activé.',
    privacy: 'Les alertes et favoris restent dans le stockage local de votre navigateur.',
  },
  en: {
    title: 'Access', subtitle: 'Use the platform directly without signing in or creating an account.',
    free: 'Free access', current: 'Access status', price: '0 — no fees',
    features: ['Crypto prices and market tracking', 'Market scanner', 'Device-local watchlist', 'Local price alerts', 'News and educational content', 'AI assistant and InstaSwap'],
    guest: 'Browsing as a guest — no account required',
    noPaid: 'No payments, auto-renewals, or paid subscriptions are enabled.',
    privacy: 'Alerts and watchlist are stored locally in your browser.',
  },
}

export default function Membership({ lang }: Props) {
  const t = text[lang]
  return <section className="page-content">
    <div className="section-heading"><div><h2>{t.title}</h2><p>{t.subtitle}</p></div><span className="ai-badge"><CircleUserRound size={16}/></span></div>
    <div className="membership-grid">
      <section className="panel membership-card">
        <div className="membership-plan-icon"><Sparkles size={23}/></div>
        <p className="membership-kicker">{t.current}</p>
        <h3>{t.free}</h3>
        <strong className="membership-price">{t.price}</strong>
        <ul>{t.features.map(feature => <li key={feature}><BadgeCheck size={16}/><span>{feature}</span></li>)}</ul>
        <p className="data-note"><ShieldCheck size={15}/>{t.noPaid}</p>
      </section>
      <section className="panel membership-card">
        <div className="membership-plan-icon"><CircleUserRound size={23}/></div>
        <p className="membership-kicker">{t.current}</p>
        <h3>{t.guest}</h3>
        <p className="data-note"><ShieldCheck size={15}/>{t.privacy}</p>
      </section>
    </div>
  </section>
}
