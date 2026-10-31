import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, Bell, BookOpen, ChevronDown,
  CircleHelp, Globe2, LayoutDashboard, LogIn, LogOut, Menu, Newspaper,
  RefreshCw, Search, ShieldCheck, Sparkles, Star, X, Send, CircleUserRound,
} from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
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
type SwapOrder = { txid?: string; id?: string; depositAddress?: string; depositAmount?: string | number; depositAmountExact?: string | number; depositMemo?: string; depositInfo?: { depositAddress?: string; depositNetwork?: string; depositToken?: string; depositAmount?: string | number; depositAmountExact?: string | number; depositMemo?: string }[] }
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
        {(deposit?.depositMemo || order.depositMemo) && <p><b>Memo / Tag:</b> <code>{deposit?.depositMemo || order.depositMemo}</code> — أدرجه إذا كان مطلوباً.</p>}
        <p>أرسل فقط <b>{deposit?.depositAmountExact || deposit?.depositAmount || order.depositAmountExact || order.depositAmount || amount}</b> من <b>{deposit?.depositNetwork || fromId.split('.')[0]}</b> / <b>{deposit?.depositToken || fromId.split('.')[1]}</b> إلى العنوان المعروض. لا ترسل من شبكة مختلفة.</p>
        <button type="button" className="button-ghost" onClick={() => void refreshStatus()}><RefreshCw size={16}/> تحديث حالة الطلب</button>
        {status && <div className="swap-status-panel"><b>حالة الطلب: {status.state || status.status || status.orderStatus || 'تم استلام تحديث الحالة'}</b><pre className="swap-status">{JSON.stringify(status, null, 2)}</pre></div>}
      </div>}
      <p className="data-note"><ShieldCheck size={15}/> المبادلة تُنفّذ عبر InstaSwap وبروتوكولاتها. راجع السعر والرسوم والحدود ومخاطر الشبكات قبل الإرسال؛ لا تضع مفاتيحك الخاصة أو عبارة الاسترداد في الموقع.</p>
    </div>
    <aside className="panel instaswap-aside"><h3>قائمة التحقق قبل الإرسال</h3><ul><li>احصل على عرض سعر جديد قبل إنشاء الطلب.</li><li>تأكد من عنوان الاستلام وعنوان الاسترداد.</li><li>راجع شبكة الإيداع وMemo / Tag إن ظهر.</li><li>لا ترسل إلا المبلغ المحدد في الطلب.</li><li>تابع الحالة باستخدام رقم الطلب.</li></ul><a href="https://instaswap.com/docs" target="_blank" rel="noopener noreferrer">وثائق InstaSwap الرسمية ↗</a><a href="https://partners.instaswap.com" target="_blank" rel="noopener noreferrer">بوابة الشركاء ↗</a></aside>
  </section>
}

type Ticker = { symbol: string; lastPrice: string; priceChangePercent: string; quoteVolume: string }
type Article = { title: string; url: string; source: string; publishedAt?: string }
type Tab = 'dashboard' | 'analytics' | 'markets' | 'scanner' | 'alerts' | 'membership' | 'news' | 'assistant' | 'swap'

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
        await createUserWithEmailAndPassword(auth, email.trim(), password)
        setTab('membership')
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
    { id: 'analytics', label: lang === 'ar' ? 'التحليل الفني' : lang === 'fr' ? 'Analyse technique' : 'Technical analysis', icon: Activity },
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

        <section className="home-swap-showcase">
          <div className="home-swap-intro">
            <div className="pill gold-pill"><RefreshCw size={14}/> INSTANT CROSS-CHAIN SWAP</div>
            <h2>بدّل العملات الرقمية مباشرة من الصفحة الرئيسية</h2>
            <p>اختر أصل الإرسال والاستلام، أدخل المبلغ، واحصل على عرض سعر مباشر من InstaSwap — دون مغادرة AI Crypto Rain.</p>
            <div className="home-swap-points"><span><ShieldCheck size={15}/> عرض سعر قبل التأكيد</span><span><Activity size={15}/> متابعة حالة الطلب</span><span><Globe2 size={15}/> تبديل عبر الشبكات</span></div>
          </div>
          <div className="home-swap-widget"><InstaSwapWidget /></div>
        </section>

        <div className="feature-strip" aria-label="Platform tools">
          <button className="feature-tile" onClick={() => navigate('markets')}><span className="feature-icon"><Activity size={19}/></span><span><b>أسعار مباشرة</b><small>متابعة الأصول وحركة 24 ساعة</small></span><ArrowUpRight size={16}/></button>
          <button className="feature-tile" onClick={() => navigate('analytics')}><span className="feature-icon"><LayoutDashboard size={19}/></span><span><b>لوحة التحليل الفني</b><small>شموع ومؤشرات واتجاهات السوق</small></span><ArrowUpRight size={16}/></button>
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
          <div className="partner-stack">
            <section className="affiliate-panel partner-card binance-partner"><div className="affiliate-glow"/><div className="affiliate-icon"><Activity size={23}/></div><div className="pill gold-pill">BINANCE AFFILIATE</div><h3>{t.affiliateTitle}</h3><p>{t.affiliateBody}</p><a className="button-primary affiliate-link" href={referralUrl} target="_blank" rel="noopener noreferrer sponsored">{t.register}<ArrowUpRight size={17}/></a><small className="disclosure">رابط شراكة • تطبق شروط Binance</small></section>

          </div>
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

      {tab === 'analytics' && <section className="page-content"><AnalyticsDashboard lang={lang}/></section>}

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


type CandlePoint = { time: string; timestamp: number; open: number; high: number; low: number; close: number; volume: number; sma20?: number; ema50?: number; rsi?: number; macd?: number; signal?: number; histogram?: number }
const emaSeries = (values: number[], period: number) => {
  const k = 2 / (period + 1)
  return values.reduce<number[]>((out, value, i) => { out.push(i === 0 ? value : value * k + out[i - 1] * (1 - k)); return out }, [])
}
function addIndicators(rows: CandlePoint[]) {
  const closes = rows.map(x => x.close)
  const ema12 = emaSeries(closes, 12), ema26 = emaSeries(closes, 26), macd = closes.map((_,i) => ema12[i] - ema26[i])
  const signal = emaSeries(macd, 9)
  return rows.map((row,i) => {
    const slice = closes.slice(Math.max(0,i-19),i+1)
    const gains:number[] = [], losses:number[] = []
    for (let j=Math.max(1,i-13); j<=i; j++) { const d=closes[j]-closes[j-1]; gains.push(Math.max(0,d)); losses.push(Math.max(0,-d)) }
    const avgGain=gains.length?gains.reduce((s,x)=>s+x,0)/gains.length:0
    const avgLoss=losses.length?losses.reduce((s,x)=>s+x,0)/losses.length:0
    const rsi=avgLoss===0?(avgGain===0?50:100):100-(100/(1+avgGain/avgLoss))
    return {...row,sma20:slice.reduce((s,x)=>s+x,0)/slice.length,ema50:emaSeries(closes,50)[i],rsi,macd:macd[i],signal:signal[i],histogram:macd[i]-signal[i]}
  })
}
function AnalyticsDashboard({lang}:{lang:Lang}) {
  const [symbol,setSymbol]=useState('BTCUSDT')
  const [interval,setIntervalValue]=useState('1h')
  const [rows,setRows]=useState<CandlePoint[]>([])
  const [busy,setBusy]=useState(true)
  const [error,setError]=useState('')
  const [updated,setUpdated]=useState<Date|null>(null)
  const isAr=lang==='ar'
  const fmt=(v:number)=>new Intl.NumberFormat(isAr?'en-US':lang,{maximumFractionDigits:v<1?5:2}).format(v)
  useEffect(()=>{
    let active=true
    const load=async()=>{
      setBusy(true);setError('')
      try {
        const response=await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=120`,{cache:'no-store'})
        if(!response.ok) throw new Error('Market data unavailable')
        const data=await response.json() as unknown[][]
        const parsed=data.map(k=>({timestamp:Number(k[0]),time:new Date(Number(k[0])).toLocaleString(lang==='ar'?'ar-MA':lang,{month:'short',day:'numeric',hour:interval==='1d'||interval==='1w'?undefined:'2-digit',minute:interval==='1d'||interval==='1w'?undefined:'2-digit'}),open:Number(k[1]),high:Number(k[2]),low:Number(k[3]),close:Number(k[4]),volume:Number(k[5])}))
        if(active){setRows(addIndicators(parsed));setUpdated(new Date())}
      } catch {if(active){setRows([]);setError(isAr?'تعذر تحميل بيانات الرسم من Binance حالياً.':'Unable to load Binance chart data right now.')}}
      finally {if(active)setBusy(false)}
    }
    void load()
    const timer=window.setInterval(load,60000)
    return ()=>{active=false;window.clearInterval(timer)}
  },[symbol,interval,lang,isAr])
  const last=rows[rows.length-1], previous=rows[rows.length-2]
  const delta=last&&previous?((last.close-previous.close)/previous.close)*100:0
  const trend=last?(last.close>=(last.sma20||last.close)?(isAr?'فوق متوسط 20':'Above SMA 20'):(isAr?'دون متوسط 20':'Below SMA 20')):'—'
  return <div className="analytics-dashboard">
    <div className="section-heading analytics-title"><div><h2>{isAr?'مركز التحليل الفني':'Technical analysis center'}</h2><p>{isAr?'بيانات السوق من Binance • المؤشرات محسوبة من الشموع المعروضة':'Binance market feed • indicators calculated from displayed candles'}</p></div><span className="official-tag"><span className="live-dot"/> {isAr?'بيانات مباشرة':'Live data'}</span></div>
    <div className="analytics-controls panel"><label>{isAr?'الأصل':'Asset'}<select value={symbol} onChange={e=>setSymbol(e.target.value)}>{['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','ADAUSDT','DOGEUSDT','TRXUSDT'].map(s=><option key={s}>{s}</option>)}</select></label><div className="timeframe-control" aria-label="Chart timeframe">{[['15m','15m'],['1h','1H'],['4h','4H'],['1d','1D'],['1w','1W']].map(([v,l])=><button key={v} className={interval===v?'selected':''} onClick={()=>setIntervalValue(v)}>{l}</button>)}</div><span className="analytics-updated">{updated?(isAr?'آخر تحديث: ':'Updated: ')+updated.toLocaleTimeString():(isAr?'جارٍ التحميل':'Loading')}</span></div>
    {error&&<div className="inline-warning"><CircleHelp size={17}/>{error}</div>}
    <div className="analytics-kpis">
      <div className="metric-card"><small>{isAr?'السعر الحالي':'Last price'}</small><strong>{last?fmt(last.close):'—'}</strong><span className={delta>=0?'positive':'negative'}>{last?(delta>=0?'+':'')+delta.toFixed(2)+'%':'—'} <small>{isAr?'مقارنة بالشمعة السابقة':'vs previous candle'}</small></span></div>
      <div className="metric-card"><small>{isAr?'أعلى سعر في الفترة':'Period high'}</small><strong>{rows.length?fmt(Math.max(...rows.map(x=>x.high))):'—'}</strong><span>{isAr?'أدنى سعر':'Period low'}: {rows.length?fmt(Math.min(...rows.map(x=>x.low))):'—'}</span></div>
      <div className="metric-card"><small>{isAr?'حجم التداول في آخر شمعة':'Latest candle volume'}</small><strong>{last?fmt(last.volume):'—'}</strong><span>{symbol.replace('USDT','')} volume</span></div>
      <div className="metric-card"><small>RSI (14)</small><strong>{last?.rsi?.toFixed(1)||'—'}</strong><span>{last?(last.rsi!>=70?(isAr?'تشبع شرائي محتمل':'Potentially overbought'):last.rsi!<=30?(isAr?'تشبع بيعي محتمل':'Potentially oversold'):(isAr?'منطقة محايدة':'Neutral zone')):'—'}</span></div>
    </div>
    <section className="panel chart-panel"><div className="panel-heading"><div><h3>{symbol} · {isAr?'حركة السعر':'Price action'}</h3><p>{isAr?'السعر مع المتوسطين المتحركين SMA 20 و EMA 50':'Price with SMA 20 and EMA 50'}</p></div><span className={delta>=0?'positive':'negative'}>{last?fmt(last.close):'—'}</span></div>{busy&&!rows.length?<div className="chart-loading">{isAr?'جارٍ تحميل الرسم البياني…':'Loading chart…'}</div>:<ResponsiveContainer width="100%" height={330}><AreaChart data={rows}><defs><linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e9bd58" stopOpacity={.28}/><stop offset="95%" stopColor="#e9bd58" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#273246" strokeDasharray="3 3"/><XAxis dataKey="time" minTickGap={35} tick={{fill:'#9aa8bd',fontSize:10}}/><YAxis orientation={isAr?'right':'left'} domain={['auto','auto']} tick={{fill:'#9aa8bd',fontSize:10}} tickFormatter={fmt} width={78}/><Tooltip contentStyle={{background:'#111827',border:'1px solid #344158',borderRadius:10,color:'#fff'}} formatter={(v:number,n:string)=>[fmt(v),n]}/><Area type="monotone" dataKey="close" name="Close" stroke="#e9bd58" strokeWidth={2} fill="url(#priceFill)" isAnimationActive={false}/><Line type="monotone" dataKey="sma20" name="SMA 20" stroke="#52c7d8" dot={false} strokeWidth={1.5} isAnimationActive={false}/><Line type="monotone" dataKey="ema50" name="EMA 50" stroke="#a78bfa" dot={false} strokeWidth={1.5} isAnimationActive={false}/></AreaChart></ResponsiveContainer>}</section>
    <div className="analytics-chart-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h3>{isAr?'حجم التداول':'Trading volume'}</h3><p>{isAr?'حجم كل شمعة':'Per-candle volume'}</p></div></div><ResponsiveContainer width="100%" height={210}><BarChart data={rows}><CartesianGrid stroke="#273246" strokeDasharray="3 3"/><XAxis dataKey="time" hide/><YAxis tick={{fill:'#9aa8bd',fontSize:9}} width={55}/><Tooltip contentStyle={{background:'#111827',border:'1px solid #344158'}}/><Bar dataKey="volume" name="Volume" fill="#3c9b89" radius={[3,3,0,0]}/></BarChart></ResponsiveContainer></section>
      <section className="panel chart-panel"><div className="panel-heading"><div><h3>MACD (12, 26, 9)</h3><p>{isAr?'الزخم وتقاطع خط الإشارة':'Momentum and signal crossover'}</p></div></div><ResponsiveContainer width="100%" height={210}><LineChart data={rows}><CartesianGrid stroke="#273246" strokeDasharray="3 3"/><XAxis dataKey="time" hide/><YAxis tick={{fill:'#9aa8bd',fontSize:9}} width={55}/><Tooltip contentStyle={{background:'#111827',border:'1px solid #344158'}}/><ReferenceLine y={0} stroke="#8290a5"/><Line type="monotone" dataKey="macd" name="MACD" stroke="#e9bd58" dot={false} isAnimationActive={false}/><Line type="monotone" dataKey="signal" name="Signal" stroke="#a78bfa" dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></section></div>
    <section className="panel chart-panel"><div className="panel-heading"><div><h3>RSI (14)</h3><p>{isAr?'مؤشر القوة النسبية — قراءة وصفية وليست إشارة تداول':'Relative strength index — informational, not a trade signal'}</p></div><b>{last?.rsi?.toFixed(1)||'—'}</b></div><ResponsiveContainer width="100%" height={190}><LineChart data={rows}><CartesianGrid stroke="#273246" strokeDasharray="3 3"/><XAxis dataKey="time" hide/><YAxis domain={[0,100]} ticks={[0,30,50,70,100]} tick={{fill:'#9aa8bd',fontSize:9}} width={35}/><Tooltip contentStyle={{background:'#111827',border:'1px solid #344158'}}/><ReferenceLine y={70} stroke="#f07883" strokeDasharray="4 4"/><ReferenceLine y={30} stroke="#42c99b" strokeDasharray="4 4"/><Line type="monotone" dataKey="rsi" name="RSI" stroke="#52c7d8" dot={false} isAnimationActive={false}/></LineChart></ResponsiveContainer></section>
    <div className="analytics-footnote"><ShieldCheck size={16}/><span>{isAr?'المؤشرات محسوبة محلياً من بيانات شموع Binance العامة؛ قد تختلف النتائج حسب المنصة والإعدادات. ليست نصيحة مالية ولا تنفذ صفقات.':'Indicators are calculated locally from public Binance candles; values may vary by venue and settings. Educational only; no trades are executed.'}</span><b>{trend}</b></div>
  </div>
}
