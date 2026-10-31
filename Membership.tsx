import { BadgeCheck, CircleUserRound, LogIn, LogOut, ShieldCheck, Sparkles } from 'lucide-react'

type Props = {
  email?: string | null
  lang: 'ar' | 'fr' | 'en'
  firebaseReady: boolean
  onSignIn: () => void
  onSignOut: () => void
}

const text = {
  ar: {
    title: 'العضوية', subtitle: 'ابدأ مجاناً واستخدم أدوات المنصة الأساسية.',
    free: 'الخطة المجانية', current: 'خطتك الحالية', price: '0 — بدون رسوم',
    features: ['أسعار العملات ومتابعة السوق', 'ماسح السوق', 'قائمة العملات المفضلة على هذا الجهاز', 'تنبيهات الأسعار المحلية', 'الأخبار ومحتوى التوعية'],
    account: 'حسابك', signed: 'تم تسجيل الدخول', guest: 'تستخدم المنصة كزائر',
    signIn: 'تسجيل الدخول أو إنشاء حساب', signOut: 'تسجيل الخروج',
    authReady: 'تسجيل الحسابات متاح عند إعداد Firebase من إعدادات المشروع.',
    authMissing: 'تسجيل الدخول غير مفعّل بعد. يمكنك استخدام الأدوات المجانية دون حساب.',
    noPaid: 'لا توجد مدفوعات أو تجديد تلقائي أو اشتراكات مدفوعة مفعّلة.',
    privacy: 'لا تُرسل بيانات التنبيهات أو المفضلة إلى خادم؛ تُحفظ محلياً في متصفحك.',
  },
  fr: {
    title: 'Adhésion', subtitle: 'Commencez gratuitement avec les outils essentiels.',
    free: 'Offre gratuite', current: 'Votre offre actuelle', price: '0 — sans frais',
    features: ['Prix des cryptomonnaies et suivi du marché', 'Scanner de marché', 'Liste de suivi sur cet appareil', 'Alertes de prix locales', 'Actualités et contenu éducatif'],
    account: 'Votre compte', signed: 'Connecté', guest: 'Vous utilisez la plateforme en invité',
    signIn: 'Se connecter ou créer un compte', signOut: 'Se déconnecter',
    authReady: 'Les comptes seront disponibles lorsque Firebase sera configuré.',
    authMissing: 'La connexion n’est pas encore activée. Les outils gratuits restent accessibles sans compte.',
    noPaid: 'Aucun paiement, renouvellement automatique ou abonnement payant n’est activé.',
    privacy: 'Les alertes et favoris restent dans le stockage local de votre navigateur.',
  },
  en: {
    title: 'Membership', subtitle: 'Start free and use the platform’s core tools.',
    free: 'Free plan', current: 'Your current plan', price: '0 — no fees',
    features: ['Crypto prices and market tracking', 'Market scanner', 'Device-local watchlist', 'Local price alerts', 'News and educational content'],
    account: 'Your account', signed: 'Signed in', guest: 'You are using the platform as a guest',
    signIn: 'Sign in or create an account', signOut: 'Sign out',
    authReady: 'Account registration is available once Firebase is configured for the project.',
    authMissing: 'Sign-in is not enabled yet. You can use the free tools without an account.',
    noPaid: 'No payments, auto-renewals, or paid subscriptions are enabled.',
    privacy: 'Alerts and watchlist are stored locally in your browser, not sent to a server.',
  },
}

export default function Membership({ email, lang, firebaseReady, onSignIn, onSignOut }: Props) {
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
        <p className="membership-kicker">{t.account}</p>
        <h3>{email || t.guest}</h3>
        <p className="membership-account-state">{email ? t.signed : t.guest}</p>
        {email
          ? <button className="button-ghost" type="button" onClick={onSignOut}><LogOut size={16}/>{t.signOut}</button>
          : <button className="button-primary" type="button" onClick={onSignIn} disabled={!firebaseReady}><LogIn size={16}/>{t.signIn}</button>}
        <p className="data-note">{firebaseReady ? t.authReady : t.authMissing}</p>
        <p className="data-note"><ShieldCheck size={15}/>{t.privacy}</p>
      </section>
    </div>
  </section>
}
