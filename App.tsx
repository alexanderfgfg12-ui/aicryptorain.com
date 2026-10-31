import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BookOpen, ChevronDown,
  CircleHelp, Globe2, LayoutDashboard, LogIn, LogOut, Menu, Newspaper,
  RefreshCw, Search, ShieldCheck, Sparkles, Star, X, Send, CircleUserRound,
} from 'lucide-react'
import {
  createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword,
  signInWithPopup, signOut, type User,
} from 'firebase/auth'
import { auth, firebaseConfigured, googleProvider } from './firebase'
import { translations, type Lang } from './i18n'
import MarketScanner from './MarketScanner'
import AlertCenter from './AlertCenter'
import Membership from './Membership'

// ==========================================
// قسم InstaSwap (مدمج مباشرة لتجنب مشاكل الملفات)
// ==========================================
type SwapToken = { id: string; symbol?: string; name?: string; minAmount?: string | number }
type SwapQuote = { estimatedOut?: string | number; estimatedOutUsd?: string | number; etaSeconds?: number; feeBreakdown?: { type?: string; asset?: string; amount?: string | number; amountUsd?: string | number }[] }
type SwapOrder = { txid?: string; id?: string; depositAddress?: string; depositAmount?: string | number; depositInfo?: { depositAddress?: string; depositNetwork?: string; depositToken?: string; depositAmount?: string | number; depositMemo?: string }[] }
const INSTASWAP_API = 'https://walletlessapi.instaswap.com'

async function instaswapRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(INSTASWAP_API + path, { ...options, headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers } })
  const raw = await response.text()
  let data: any = {}
  try { data = raw ? JSON.parse(raw) : {} } catch { data = { message: raw } }
  if (!response.ok) throw new Error(data?.message || data?.error || data?.reason || `InstaSwap request failed (${response.status})`)
  return data as T
}

function InstaSwapWidget() {
  const affiliateId = (import.meta.env.VITE_INSTASWAP_AFFILIATE_ID || '').trim()
  const [tokens, setTokens] = useState<SwapToken[]>([])
  const [tokensLoading, setTokensLoading] = useState(true)
  const [tokensError, setTokensError] = useState(false)
  const [fromId, setFromId] = useState('btc.btc')
  const [toId, setToId] = useState('eth.eth')
  const [amount, setAmount] = useState('0.001')
  const [recipient, setRecipient] = useState('')
  const [refund, setRefund] = useState('')
  const [privateRoute, setPrivateRoute] = useState(true)
  const [phase, setPhase] = useState<'idle' | 'quoting' | 'quoted' | 'creating' | 'created' | 'error'>('idle')
  const [quote, setQuote] = useState<SwapQuote | null>(null)
  const [order, setOrder] = useState<SwapOrder | null>(null)
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState('')
  const reset = () => { setQuote(null); setOrder(null); setStatus(null); setError(''); setPhase('idle') }

  useEffect(() => {
    let active = true
    instaswapRequest<any>('/tokens-lite').then(data => {
      const rows = Array.isArray(data) ? data : Array.isArray(data?.tokens) ? data.tokens : Array.isArray(data?.data) ? data.data : []
      const list = rows.filter((x: any) => typeof x?.id === 'string').map((x: any) => ({ id: x.id, symbol: x.symbol, name: x.name, minAmount: x.minAmount ?? x.minimum ?? x.min })).sort((a: SwapToken,b: SwapToken) => (a.symbol || a.id).localeCompare(b.symbol || b.id))
      if (!active) return
      setTokens(list); setTokensError(!list.length)
      if (list.length && !list.some((x: SwapToken) => x.id === 'btc.btc')) setFromId(list[0].id)
      if (list.length && !list.some((x: SwapToken) => x.id === 'eth.eth')) setToId(list[Math.min(1,list.length-1)].id)
    }).catch(() => { if (active) setTokensError(true) }).finally(() => { if (active) setTokensLoading(false) })
    return () => { active = false }
  }, [])

  const options = tokens.length ? tokens : [{ id: 'btc.btc', symbol: 'BTC', name: 'Bitcoin' }, { id: 'eth.eth', symbol: 'ETH', name: 'Ethereum' }]
  const label = (x: SwapToken) => `${x.symbol || x.id.toUpperCase()} — ${x.name || x.id}`

  async function getQuote() {
    if (!affiliateId) { setError('يلزم معرّف الشريك من InstaSwap Partners لتفعيل طلبات الأسعار.'); setPhase('error'); return }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0 || fromId === toId) { setError('أدخل مبلغاً صحيحاً واختر أصلين مختلفين.'); setPhase('error'); return }
    setPhase('quoting'); setError(''); setQuote(null); setOrder(null); setStatus(null)
    try {
      const result = await instaswapRequest<SwapQuote>('/quote-lite', { method: 'POST', body: JSON.stringify({ affiliateId, from: fromId, to: toId, amount: amount.trim(), private: privateRoute }) })
      if (result.estimatedOut == null) throw new Error('لم يُرجع InstaSwap كمية استلام تقديرية لهذا الزوج.')
      setQuote(result); setPhase('quoted')
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر الحصول على عرض السعر.'); setPhase('error') }
  }

  async function createSwap() {
    if (!affiliateId || !quote || !recipient.trim() || !refund.trim()) return
    setPhase('creating'); setError('')
    try {
      const result = await instaswapRequest<SwapOrder>('/swap-lite', { method: 'POST', body: JSON.stringify({ affiliateId, from: fromId, to: toId, amount: amount.trim(), recipientAddress: recipient.trim(), refundAddress: refund.trim(), private: privateRoute }) })
      if (!result.txid && !result.id) throw new Error('لم يُرجع InstaSwap رقم طلب صالحاً.')
      setOrder(result); setPhase('created')
    } catch (e) { setError(e instanceof Error ? e.message : 'تعذر إنشاء طلب التبديل.'); setPhase('error') }
  }

  async function refreshStatus() {
    const id = order?.txid || order?.id
    if (!id) return
    try { setStatus(await instaswapRequest<any>(`/swap/${encodeURIComponent(id)}/status-lite`)) }
    catch (e) { setError(e instanceof Error ? e.message : 'تعذر تحديث حالة الطلب.') }
  }

  const deposit = order?.depositInfo?.[0]
  const depositAddress = deposit?.depositAddress || order?.depositAddress

  return <section className="instaswap-layout">
    <div className="panel instaswap-card">
      <div className="instaswap-heading"><div><span className="pill gold-pill">INSTANT CROSS-CHAIN SWAP</span><h3>حوّل أصولك عبر الشبكات</h3><p>اطلب عرض سعر مباشر، راجع التفاصيل، ثم أنشئ الطلب بنفسك. لا ترسل أموالاً قبل التحقق من عنوان الإيداع والشبكة.</p></div><span className="instaswap-mark"><RefreshCw size={23}/></span></div>
      {!affiliateId && <div className="inline-warning"><CircleHelp size={17}/><span>التفعيل بانتظار معرّف الشريك: أضف <code>VITE_INSTASWAP_AFFILIATE_ID</code> إلى إعدادات GitHub Actions بعد التسجيل وإضافة النطاق في بوابة الشركاء.</span></div>}
      {tokensError && <div className="inline-warning"><CircleHelp size={17}/><span>تعذر تحميل قائمة الأصول الآن. الأصول الافتراضية للتجربة فقط؛ لا تنشئ طلباً قبل التأكد من دعم الزوج.</span></div>}
      <div className="swap-form-grid">
        <label>أرسل من<select value={fromId} onChange={e => { setFromId(e.target.value); reset() }}>{options.map(x => <option key={x.id} value={x.id}>{label(x)}</option>)}</select></label>
        <label>استلم إلى<select value={toId} onChange={e => { setToId(e.target.value); reset() }}>{options.map(x => <option key={x.id} value={x.id}>{label(x)}</option>)}</select></label>
        <label className="swap-amount-field">المبلغ المراد إرساله<input value={amount} onChange={e => { setAmount(e.target.value); reset() }} inputMode="decimal" placeholder="0.001"/></label>
        <label className="swap-private-toggle"><input type="checkbox" checked={privateRoute} onChange={e => { setPrivateRoute(e.target.checked); reset() }}/> تفضيل مسار تسوية خاص (حسب التوفر والرسوم)</label>
      </div>
      <button className="button-primary swap-quote-button" type="button" onClick={() => void getQuote()} disabled={!affiliateId || tokensLoading || phase === 'quoting' || phase === 'creating' || !amount.trim()}>{phase === 'quoting' ? 'جارٍ طلب السعر…' : 'احصل على عرض سعر'}</button>
      {tokensLoading && <p className="data-note">جارٍ تحميل الأصول المدعومة من InstaSwap…</p>}
      {error && <div className="swap-error" role="alert"><CircleHelp size={17}/>{error}</div>}
      {quote && <div className="swap-quote-result">
        <div className="swap-result-main"><span>الكمية التقديرية للاستلام</span><strong>{quote.estimatedOut} <small>{toId.split('.')[1]?.toUpperCase()}</small></strong>{quote.estimatedOutUsd != null && <small>قيمة تقريبية: ${quote.estimatedOutUsd} USD</small>}</div>
        <div className="swap-result-meta"><span>الوقت التقديري</span><b>{quote.etaSeconds ? `نحو ${Math.ceil(quote.etaSeconds/60)} دقيقة` : 'يعتمد على الشبكة والسيولة'}</b></div>
        {!!quote.feeBreakdown?.length && <div className="swap-fees"><b>تفصيل الرسوم من InstaSwap</b>{quote.feeBreakdown.map((f,i) => <span key={i}>{f.type || 'رسوم'} · {f.amount ?? '—'} {f.asset || ''}{f.amountUsd != null ? ` ($${f.amountUsd})` : ''}</span>)}</div>}
        <div className="swap-address-grid"><label>عنوان الاستلام على الشبكة المستهدفة<input value={recipient} onChange={e => { setRecipient(e.target.value); setOrder(null); setStatus(null) }} placeholder="أدخل عنوان محفظة الاستلام"/></label><label>عنوان الاسترداد على شبكة الإرسال<input value={refund} onChange={e => { setRefund(e.target.value); setOrder(null); setStatus(null) }} placeholder="أدخل عنوان استرداد صالحاً"/></label></div>
        <p className="swap-safety-note">تحقق من الشبكة والعنوانين بنفسك. إرسال أصل إلى شبكة أو عنوان غير صحيح قد يؤدي إلى فقدانه نهائياً.</p>
        <button className="button-primary swap-quote-button" type="button" onClick={() => void createSwap()} disabled={!recipient.trim() || !refund.trim() || phase === 'creating'}>{phase === 'creating' ? 'جارٍ إنشاء الطلب…' : 'تأكيد إنشاء طلب التبديل'}</button>
      </div>}
      {order && <div className="swap-order-result" aria-live="polite"><span className="official-tag">تم إنشاء الطلب لدى InstaSwap</span><h3>راجع تفاصيل الإيداع قبل التحويل</h3><p>رقم الطلب: <code>{order.txid || order.id}</code></p>
        {depositAddress && <div className="deposit-address"><small>عنوان الإيداع</small><code>{depositAddress}</code><button type="button" className="button-ghost" onClick={() => { if (navigator.clipboard?.writeText) void navigator.clipboard.writeText(depositAddress) }}>نسخ العنوان</button></div>}
        {deposit?.depositMemo && <p><b>Memo / Tag:</b> <code>{deposit.depositMemo}</code> — أدرجه إذا كان مطلوباً.</p>}
        <p>أرسل فقط <b>{deposit?.depositAmount || order.depositAmount || amount}</b> من <b>{deposit?.depositNetwork || fromId.split('.')[0]}</b> / <b>{deposit?.depositToken || fromId.split('.')[1]}</b> إلى العنوان المعروض. لا ترسل من شبكة مختلفة.</p>
        <button type="button" className="button-ghost" onClick={() => void refreshStatus()}><RefreshCw size={16}/> تحديث حالة الطلب</button>
        {status && <pre className="swap-status">{JSON.stringify(status, null, 2)}</pre>}
      </div>}
      <p className="data-note"><ShieldCheck size={15}/> المبادلة تُنفّذ عبر InstaSwap وبروتوكولاتها. راجع السعر والرسوم والحدود ومخاطر الشبكات قبل الإرسال؛ لا تضع مفاتيحك الخاصة أو عبارة الاسترداد في الموقع.</p>
    </div>
    <aside className="panel instaswap-aside"><h3>قائمة التحقق قبل الإرسال</h3><ul><li>احصل على عرض سعر جديد قبل إنشاء الطلب.</li><li>تأكد من عنوان الاستلام وعنوان الاسترداد.</li><li>راجع شبكة الإيداع وMemo / Tag إن ظهر.</li><li>لا ترسل إلا المبلغ المحدد في الطلب.</li><li>تابع الحالة باستخدام رقم الطلب.</li></ul><a href="https://instaswap.com/docs" target="_blank" rel="noopener noreferrer">وثائق InstaSwap الرسمية ↗</a><a href="https://partners.instaswap.com" target="_blank" rel="noopener noreferrer">بوابة الشركاء ↗</a></aside>
  </section>
}

type Ticker = { symbol: string; lastPrice: string; priceChangePercent: string; quoteVolume: string }
type Article = { title: string; url: string; source: string; publishedAt?: string }
type Tab = 'dashboard' | 'markets' | 'scanner' | 'alerts' | 'membership' | 'news' | 'assistant' | 'swap'

const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'TRXUSDT']
const currencyFormat = (value: number, lang: Lang) => new Intl.NumberFormat(lang === 'ar' ? 'en-US' : lang, {
  style: 'currency', currency: 'USD', maximumFractionDigits: value < 1 ? 6 : 2,
}).format(value)
const prettySymbol = (symbol: string) => symbol.replace('USDT', '')

export default function App() {
  const [lang, setLang] = useState<Lang>('ar')
  const [tab, setTab] = useState<Tab>('dashboard')
  const [mobileNav, setMobileNav] = useState(false)
  const [tickers, setTickers] = useState<Ticker[]>([])
  const [tickerError, setTickerError] = useState(false)
  const [loadingPrices, setLoadingPrices] = useState(true)
  const [articles, setArticles] = useState<Article[]>([])
  const [newsLoading, setNewsLoading] = useState(false)
  const [newsError, setNewsError] = useState(false)
  const [search, setSearch] = useState('')
  const [watchlist, setWatchlist] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('acr-watchlist') || '["BTC","ETH","SOL"]') as string[] } catch { return ['BTC', 'ETH', 'SOL'] }
  })
  const [user, setUser] = useState<User | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiMessages, setAiMessages] = useState<{ role: 'assistant' | 'user'; text: string }[]>([])
  const [aiBusy, setAiBusy] = useState(false)

  const t = translations[lang]
  const isRtl = lang === 'ar'
  const referralUrl = import.meta.env.VITE_BINANCE_REFERRAL_URL || 'https://www.binance.com/ar/register?ref=1038345380'
  const aiApiUrl = import.meta.env.VITE_AI_API_URL

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr'
  }, [lang, isRtl])

  useEffect(() => {
    if (!auth) return
    return onAuthStateChanged(auth, setUser)
  }, [])

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/24hr', { cache: 'no-store' })
        if (!res.ok) throw new Error('Market API unavailable')
        const data = await res.json() as Ticker[]
        const chosen = data.filter(item => symbols.includes(item.symbol))
        if (alive) { setTickers(chosen); setTickerError(false) }
      } catch {
        if (alive) setTickerError(true)
      } finally {
        if (alive) setLoadingPrices(false)
      }
    }
    void load()
    const timer = window.setInterval(load, 60_000)
    return () => { alive = false; window.clearInterval(timer) }
  }, [])

  const loadNews = async () => {
    setNewsLoading(true)
    setNewsError(false)
    try {
      const res = await fetch('https://cryptocurrency.cv/api/news?limit=8')
      if (!res.ok) throw new Error('News API unavailable')
      const json: unknown = await res.json()
      const rows = Array.isArray(json) ? json : (
        json && typeof json === 'object' && 'data' in json && Array.isArray((json as {data: unknown}).data)
          ? (json as {data: unknown[]}).data
          : json && typeof json === 'object' && 'articles' in json && Array.isArray((json as {articles: unknown}).articles)
            ? (json as {articles: unknown[]}).articles : []
      )
      const safe = (rows as Record<string, unknown>[]).map((row): Article | null => {
        const title = typeof row.title === 'string' ? row.title : typeof row.headline === 'string' ? row.headline : ''
        const rawUrl = typeof row.url === 'string' ? row.url : typeof row.link === 'string' ? row.link : ''
        let url = ''
        try {
          const parsed = new URL(rawUrl)
          if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) url = parsed.href
        } catch { /* Ignore malformed URLs. */ }
        if (!title || !url) return null
        return {
          title: title.slice(0, 240),
          url,
          source: (typeof row.source === 'string' ? row.source : typeof row.author === 'string' ? row.author : 'News').slice(0, 80),
          publishedAt: typeof row.published_at === 'string' ? row.published_at : typeof row.date === 'string' ? row.date : undefined,
        }
      }).filter((x): x is Article => x !== null).slice(0, 8)
      setArticles(safe)
    } catch {
      setNewsError(true)
      setArticles([])
    } finally {
      setNewsLoading(false)
    }
  }

  useEffect(() => { void loadNews() }, [])

  useEffect(() => {
    try { localStorage.setItem('acr-watchlist', JSON.stringify(watchlist)) } catch { /* Storage may be disabled. */ }
  }, [watchlist])

  const visibleTickers = useMemo(() => tickers.filter(item =>
    prettySymbol(item.symbol).toLowerCase().includes(search.toLowerCase().trim()),
  ), [tickers, search])

  const navigate = (next: Tab) => { setTab(next); setMobileNav(false) }
  const toggleWatch = (symbol: string) => setWatchlist(old =>
    old.includes(symbol) ? old.filter(s => s !== symbol) : [...old, symbol],
  )

  const submitAuth = async (event: FormEvent) => {
    event.preventDefault()
    if (!auth) { setAuthMessage(t.authDisabled); return }
    setAuthBusy(true); setAuthMessage('')
    try {
      if (authMode === 'signup') {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password)
        setTab('community')
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
      setAuthOpen(false); setPassword(''); setAuthMessage('')
    } catch {
      setAuthMessage(t.authError)
    } finally { setAuthBusy(false) }
  }

  const submitAI = async (event: FormEvent) => {
    event.preventDefault()
    const prompt = aiPrompt.trim()
    if (!prompt || aiBusy) return
    setAiMessages(old => [...old, { role: 'user', text: prompt }])
    setAiPrompt('')
    if (!aiApiUrl) {
      setAiMessages(old => [...old, { role: 'assistant', text: t.aiUnavailable }])
      return
    }
    setAiBusy(true)
    try {
      const response = await fetch(aiApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt, language: lang, market: tickers.slice(0, 8) }),
      })
      if (!response.ok) throw new Error('AI endpoint failed')
      const data = await response.json() as { answer?: unknown }
      const answer = typeof data.answer === 'string' ? data.answer : t.aiUnavailable
      setAiMessages(old => [...old, { role: 'assistant', text: answer.slice(0, 8000) }])
    } catch {
      setAiMessages(old => [...old, { role: 'assistant', text: t.aiUnavailable }])
    } finally { setAiBusy(false) }
  }

  const signInGoogle = async () => {
    if (!auth) { setAuthMessage(t.authDisabled); return }
    setAuthBusy(true); setAuthMessage('')
    try { await signInWithPopup(auth, googleProvider); setAuthOpen(false) }
    catch { setAuthMessage(t.authError) }
    finally { setAuthBusy(false) }
  }

  const navItems: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard },
    { id: 'markets', label: t.markets, icon: Activity },
    { id: 'scanner', label: lang === 'ar' ? 'ماسح السوق' : lang === 'fr' ? 'Scanner' : 'Scanner', icon: Search },
    { id: 'alerts', label: lang === 'ar' ? 'تنبيهات الأسعار' : lang === 'fr' ? 'Alertes' : 'Price alerts', icon: Bell },
    { id: 'membership', label: lang === 'ar' ? 'العضوية المجانية' : lang === 'fr' ? 'Adhésion' : 'Membership', icon: CircleUserRound },
    { id: 'news', label: t.news, icon: Newspaper },
    { id: 'assistant', label: t.assistant, icon: Sparkles },
    { id: 'swap', label: 'تبديل InstaSwap', icon: RefreshCw },
  ]

  return <div className="app-shell" dir={isRtl ? 'rtl' : 'ltr'}>
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('dashboard') }}>
        <span className="brand-mark">☔</span><span><b>AI Crypto Rain</b><small>{t.tagline}</small></span>
      </a>
      <div className="nav-caption">{t.dashboard}</div>
      <nav className="nav-list" aria-label="Primary navigation">
        {navItems.map(item => {
          const Icon = item.icon
          return <button key={item.id} className={`nav-item ${tab === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}>
            <Icon size={19}/><span>{item.label}</span>{tab === item.id && <span className="nav-active-dot"/>}
          </button>
        })}
      </nav>
      <div className="sidebar-bottom">
        <div className="secure-note"><ShieldCheck size={18}/><span>{t.statusDemo}</span></div>
        <button className="user-button" onClick={() => user ? void signOut(auth!) : (setAuthOpen(true), setAuthMessage(''))}>
          <span className="avatar">{user ? (user.email?.[0] || 'U').toUpperCase() : <LogIn size={18}/>}</span>
          <span className="user-copy"><b>{user?.email || t.signIn}</b><small>{user ? t.signOut : 'Firebase Auth'}</small></span>
          {user ? <LogOut size={16}/> : <ChevronDown size={16}/>}
        </button>
      </div>
    </aside>

    {mobileNav && <button className="mobile-scrim" aria-label={t.close} onClick={() => setMobileNav(false)}/>}
    <main className="main-area">
      <header className="topbar">
        <div className="topbar-start">
          <button className="icon-button mobile-menu" aria-label="Menu" onClick={() => setMobileNav(!mobileNav)}><Menu size={21}/></button>
          <div><div className="eyebrow"><span className="live-dot"/>{t.liveData}</div><h1>{navItems.find(x => x.id === tab)?.label}</h1></div>
        </div>
        <div className="top-actions">
          <div className="language-picker"><Globe2 size={17}/><select aria-label="Language" value={lang} onChange={e => setLang(e.target.value as Lang)}><option value="ar">العربية</option><option value="fr">Français</option><option value="en">English</option></select></div>
          <button className="icon-button" aria-label={t.watchlist} onClick={() => navigate('markets')}><Bell size={19}/></button>
          <button className="profile-button" onClick={() => user ? void signOut(auth!) : (setAuthOpen(true), setAuthMessage(''))}>
            <span className="avatar">{user ? (user.email?.[0] || 'U').toUpperCase() : 'U'}</span><span>{user ? (user.email || '').split('@')[0] : t.signIn}</span>
          </button>
        </div>
      </header>

      {tab === 'dashboard' && <section className="page-content">
        <div className="hero-panel">
          <div className="hero-copy"><div className="pill"><Sparkles size={14}/>{t.brand} <span>•</span> Web3 intelligence</div>
            <h2>{t.welcome}</h2><p>{t.subtitle}</p>
            <div className="hero-buttons"><button className="button-primary" onClick={() => navigate('markets')}>{t.markets}<Activity size={17}/></button><button className="button-ghost" onClick={() => navigate('swap')}>InstaSwap <RefreshCw size={17}/></button></div>
          </div>
          <div className="hero-art" aria-hidden="true"><div className="orb orb-one"/><div className="orb orb-two"/><div className="coin coin-btc">₿</div><div className="coin coin-eth">◆</div><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="art-label"><Activity size={15}/> Market intelligence</div></div>
        </div>

        <div className="feature-strip" aria-label="Platform tools">
          <button className="feature-tile" onClick={() => navigate('markets')}><span className="feature-icon"><Activity size={19}/></span><span><b>أسعار مباشرة</b><small>متابعة الأصول وحركة 24 ساعة</small></span><ArrowUpRight size={16}/></button>
          <button className="feature-tile" onClick={() => navigate('scanner')}><span className="feature-icon"><Search size={19}/></span><span><b>ماسح السوق</b><small>اكتشف الارتفاعات والانخفاضات</small></span><ArrowUpRight size={16}/></button>
          <button className="feature-tile" onClick={() => navigate('swap')}><span className="feature-icon"><RefreshCw size={19}/></span><span><b>تبديل InstaSwap</b><small>عرض سعر وتتبع المبادلة</small></span><ArrowUpRight size={16}/></button>
        </div>

        <div className="section-heading"><div><h2>{t.marketOverview}</h2><p>{t.liveData}</p></div><button className="text-button" onClick={() => navigate('markets')}>{t.markets} <span>↗</span></button></div>
        {tickerError && <div className="inline-warning"><CircleHelp size={17}/>{t.newsFallback}</div>}
        <div className="market-grid">
          {['BTC','ETH','BNB','SOL'].map(symbol => {
            const item = tickers.find(x => prettySymbol(x.symbol) === symbol)
            const change = Number(item?.priceChangePercent || 0)
            return <div className="metric-card" key={symbol}>
              <div className="metric-top"><span className={`asset-icon asset-${symbol.toLowerCase()}`}>{symbol === 'BTC' ? '₿' : symbol === 'ETH' ? '◆' : symbol === 'BNB' ? '⬡' : '◎'}</span><div className="metric-name"><b>{symbol}</b><small>{symbol === 'BTC' ? 'Bitcoin' : symbol === 'ETH' ? 'Ethereum' : symbol === 'BNB' ? 'BNB' : 'Solana'}</small></div><button className={`star-button ${watchlist.includes(symbol) ? 'starred' : ''}`} aria-label={`${t.action} ${symbol}`} onClick={() => toggleWatch(symbol)}><Star size={17} fill={watchlist.includes(symbol) ? 'currentColor' : 'none'}/></button></div>
              <div className="metric-price">{loadingPrices ? '—' : item ? currencyFormat(Number(item.lastPrice), lang) : '—'}</div>
              <div className={`metric-change ${change >= 0 ? 'positive' : 'negative'}`}>{change >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownRight size={16}/>} {item ? `${change.toFixed(2)}%` : '—'} <span>24h</span></div>
              <div className="sparkline"><span style={{width: `${Math.min(100, Math.max(8, 50 + change * 4))}%`}}/></div>
            </div>
          })}
        </div>

        <div className="two-column">
          <section className="panel"><div className="panel-heading"><div><h3>{t.newsTitle}</h3><p>Curated headlines</p></div><button className="icon-button" aria-label={t.refresh} onClick={() => void loadNews()}><RefreshCw size={17}/></button></div>
            <NewsList articles={articles.slice(0, 4)} loading={newsLoading} error={newsError} t={t}/><button className="button-wide" onClick={() => navigate('news')}>{t.news} <span>↗</span></button>
          </section>
          <section className="affiliate-panel"><div className="affiliate-glow"/><div className="affiliate-icon"><Activity size={23}/></div><div className="pill gold-pill">BINANCE PARTNER LINK</div><h3>{t.affiliateTitle}</h3><p>{t.affiliateBody}</p><a className="button-primary affiliate-link" href={referralUrl} target="_blank" rel="noopener noreferrer sponsored">{t.register}<ArrowUpRight size={17}/></a><small className="disclosure">Affiliate link • Binance terms apply</small></section>
        </div>
        <section className="panel converter-panel"><div className="panel-heading"><div><h3>{t.convertTitle}</h3><p>{t.convertDescription}</p></div><span className="official-tag"><ShieldCheck size={15}/> Binance</span></div><BinanceWidget lang={lang}/></section>
      </section>}

      {tab === 'markets' && <section className="page-content">
        <div className="section-heading"><div><h2>{t.marketOverview}</h2><p>{t.statusDemo}</p></div><div className="search-box"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search}/></div></div>
        <section className="panel market-table-panel"><div className="panel-heading"><div><h3>{t.markets}</h3><p>{loadingPrices ? t.loading : `${visibleTickers.length} assets`}</p></div><button className="icon-button" onClick={() => window.location.reload()} aria-label={t.refresh}><RefreshCw size={17}/></button></div>
          <div className="table-scroll"><table><thead><tr><th>{t.asset}</th><th>{t.price}</th><th>{t.change}</th><th>{t.action}</th></tr></thead><tbody>
            {visibleTickers.map(item => {
              const symbol = prettySymbol(item.symbol); const change = Number(item.priceChangePercent)
              return <tr key={item.symbol}><td><span className={`asset-icon small asset-${symbol.toLowerCase()}`}>{symbol === 'BTC' ? '₿' : symbol === 'ETH' ? '◆' : symbol === 'BNB' ? '⬡' : symbol === 'SOL' ? '◎' : symbol.slice(0,1)}</span><b>{symbol}</b><span className="muted">{symbol === 'BTC' ? ' / Bitcoin' : ' / USDT'}</span></td><td className="number-cell">{currencyFormat(Number(item.lastPrice), lang)}</td><td><span className={`change-chip ${change >= 0 ? 'positive' : 'negative'}`}>{change >= 0 ? '+' : ''}{change.toFixed(2)}%</span></td><td><button className={`star-button ${watchlist.includes(symbol) ? 'starred' : ''}`} onClick={() => toggleWatch(symbol)} aria-label={`${t.action} ${symbol}`}><Star size={17} fill={watchlist.includes(symbol) ? 'currentColor' : 'none'}/></button></td></tr>
            })}
            {!loadingPrices && visibleTickers.length === 0 && <tr><td colSpan={4} className="empty-cell">{tickerError ? t.newsFallback : t.noNews}</td></tr>}
          </tbody></table></div>
          <p className="data-note"><ShieldCheck size={15}/>{t.footer}</p>
        </section>
        <section className="panel converter-panel"><div className="panel-heading"><div><h3>{t.convertTitle}</h3><p>{t.convertDescription}</p></div><span className="official-tag">Binance</span></div><BinanceWidget lang={lang}/></section>
      </section>}

      {tab === 'scanner' && <MarketScanner tickers={tickers} loading={loadingPrices} lang={lang}/>}

      {tab === 'alerts' && <AlertCenter tickers={tickers} lang={lang}/>}

      {tab === 'membership' && <Membership email={user?.email} lang={lang} firebaseReady={firebaseConfigured} onSignIn={() => { setAuthOpen(true); setAuthMessage('') }} onSignOut={() => { if (auth) void signOut(auth) }}/ >}

      {tab === 'news' && <section className="page-content"><div className="section-heading"><div><h2>{t.newsTitle}</h2><p>{t.source}: cryptocurrency.cv</p></div><button className="button-ghost" onClick={() => void loadNews()}><RefreshCw size={16}/>{t.refresh}</button></div><section className="panel news-panel"><NewsList articles={articles} loading={newsLoading} error={newsError} t={t}/></section></section>}

      {tab === 'assistant' && <section className="page-content"><div className="section-heading"><div><h2>{t.aiTitle}</h2><p>{t.aiDisclaimer}</p></div><span className="ai-badge"><Sparkles size={16}/> AI</span></div>
        <section className="panel assistant-panel"><div className="assistant-intro"><div className="assistant-avatar"><Sparkles size={25}/></div><div><h3>{t.aiTitle}</h3><p>{t.aiIntro}</p></div></div>
          <div className="chat-log" aria-live="polite"><div className="chat-bubble assistant-bubble">{t.aiIntro}</div>{aiMessages.map((m,i)=><div key={i} className={`chat-bubble ${m.role === 'user' ? 'user-bubble' : 'assistant-bubble'}`}>{m.text}</div>)}{aiBusy && <div className="chat-bubble assistant-bubble">{t.loading}</div>}</div>
          <form className="chat-form" onSubmit={submitAI}><input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} placeholder={t.aiPlaceholder} aria-label={t.aiPlaceholder}/><button className="button-primary" type="submit" disabled={aiBusy || !aiPrompt.trim()}><Send size={17}/>{t.send}</button></form>
          <p className="data-note"><ShieldCheck size={15}/>{t.aiDisclaimer}</p>
        </section>
      </section>}

      {tab === 'swap' && <section className="page-content">
        <div className="section-heading"><div><h2>مركز InstaSwap</h2><p>قارن عرض السعر، راجع الرسوم، ثم أنشئ طلب التبديل بنفسك.</p></div><span className="official-tag"><ShieldCheck size={15}/> Walletless API</span></div>
        <InstaSwapWidget />
      </section>}

      <footer className="site-footer"><span>☔ AI Crypto Rain</span><span>{t.footer}</span><div><BookOpen size={15}/> Educational use only</div></footer>
    </main>

    {authOpen && <div className="modal-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setAuthOpen(false) }}><section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <button className="modal-close" aria-label={t.close} onClick={() => setAuthOpen(false)}><X size={19}/></button><div className="modal-brand">☔</div><h2 id="auth-title">{t.signIn}</h2>
      <div className="auth-tabs"><button className={authMode === 'login' ? 'selected' : ''} onClick={() => setAuthMode('login')}>{t.login}</button><button className={authMode === 'signup' ? 'selected' : ''} onClick={() => setAuthMode('signup')}>{t.signup}</button></div>
      <form onSubmit={submitAuth} className="auth-form"><label>{t.loginEmail}<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}/></label><label>{t.password}<input type="password" required minLength={6} autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)}/></label><button className="button-primary full-button" disabled={authBusy}>{authBusy ? t.loading : authMode === 'login' ? t.login : t.signup}</button></form>
      <button className="google-button" onClick={() => void signInGoogle()} disabled={authBusy}><span className="google-g">G</span>{t.google}</button>{authMessage && <p className="auth-message" role="status">{authMessage}</p>}
      {!firebaseConfigured && <p className="auth-help">{t.authDisabled}</p>}
    </section></div>}
  </div>
}

function NewsList({ articles, loading, error, t }: { articles: Article[]; loading: boolean; error: boolean; t: typeof translations[Lang] }) {
  if (loading) return <div className="state-message"><RefreshCw className="spin" size={19}/>{t.loading}</div>
  if (error) return <div className="state-message"><CircleHelp size={20}/>{t.newsFallback}</div>
  if (!articles.length) return <div className="state-message"><Newspaper size={20}/>{t.noNews}</div>
  return <ul className="news-list">{articles.map((article, i) => <li key={article.url}><span className="news-index">{String(i + 1).padStart(2, '0')}</span><div className="news-copy"><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}</a><small>{article.source}{article.publishedAt ? ` · ${new Date(article.publishedAt).toLocaleDateString()}` : ''}</small></div><a className="news-open" href={article.url} target="_blank" rel="noopener noreferrer" aria-label={article.title}>↗</a></li>)}</ul>
}

function BinanceWidget({ lang }: { lang: Lang }) {
  useEffect(() => {
    const scriptId = 'binance-converter-script'
    const initWidget = () => {
      const container = document.getElementById(`binance-widget-${lang}`)
      if (!container) return
      container.innerHTML = ''
      const widget = document.createElement('div')
      widget.className = 'binance-converter-widget'
      widget.dataset.locale = lang
      widget.dataset.coin = 'BTC'
      widget.dataset.fiat = 'USD'
      widget.dataset.width = '100%'
      widget.dataset.theme = 'dark'
      widget.dataset.transparent = 'false'
      widget.dataset.showCta = 'true'
      widget.dataset.ctaText = 'Buy {{coin}}'
      widget.dataset.widgetTitle = '{{coin}} to {{currency}} Converter'
      widget.dataset.coinLabel = 'Coin'
      widget.dataset.currencyLabel = 'Currency'
      widget.dataset.referralCode = '1038345380'
      widget.dataset.poweredBy = 'Powered by'
      widget.dataset.disclaimer = 'Disclaimer'
      widget.dataset.utmSource = 'aicryptorain'
      container.appendChild(widget)
      const api = (window as Window & { cryptoConverterWidget?: { init?: () => void } }).cryptoConverterWidget
      try { api?.init?.() } catch { /* Widget failures should not break the page. */ }
    }
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null
    if (existing) {
      if ((window as Window & { cryptoConverterWidget?: unknown }).cryptoConverterWidget) initWidget()
      else existing.addEventListener('load', initWidget, { once: true })
    } else {
      const script = document.createElement('script')
      script.id = scriptId
      script.src = 'https://public.bnbstatic.com/unpkg/growth-external-widget/cryptoConverterWidget@0.1.0.min.js'
      script.async = true
      script.onload = initWidget
      document.body.appendChild(script)
    }
    return () => {
      const container = document.getElementById(`binance-widget-${lang}`)
      if (container) container.innerHTML = ''
    }
  }, [lang])
  return <div id={`binance-widget-${lang}`} className="binance-widget-host"><div className="widget-placeholder"><Activity size={20}/> Loading Binance converter…</div></div>
}
