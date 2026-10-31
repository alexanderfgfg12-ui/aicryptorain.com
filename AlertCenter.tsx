import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Bell, BellRing, Plus, Trash2 } from 'lucide-react'

type Ticker = { symbol: string; lastPrice: string; priceChangePercent: string; quoteVolume: string }
type AlertRule = {
  id: string
  symbol: string
  direction: 'above' | 'below'
  target: number
  active: boolean
  fired: boolean
}
type Props = { tickers: Ticker[]; lang: 'ar' | 'fr' | 'en' }

const STORAGE_KEY = 'acr-price-alerts-v1'
const copy = {
  ar: {
    title: 'تنبيهات الأسعار', subtitle: 'أنشئ تنبيهاً عندما يصل السعر إلى المستوى الذي تحدده.',
    coin: 'العملة', condition: 'الشرط', above: 'عندما يصبح السعر أعلى من', below: 'عندما يصبح السعر أقل من',
    target: 'السعر المستهدف (USD)', add: 'إضافة تنبيه', active: 'نشط', paused: 'متوقف',
    fired: 'تم تفعيل التنبيه', remove: 'حذف', empty: 'لا توجد تنبيهات بعد. أضف أول تنبيه لك.',
    permission: 'تفعيل إشعارات المتصفح', granted: 'إشعارات المتصفح مفعّلة',
    denied: 'إشعارات المتصفح غير متاحة أو تم رفضها.',
    note: 'التنبيهات مجانية ومحفوظة على هذا الجهاز فقط. تعمل أثناء فتح الموقع وتحديث بياناته؛ لا ترسل إشعارات عندما يكون الموقع مغلقاً. لا تمثل توصية استثمارية.',
    invalid: 'أدخل سعراً مستهدفاً صحيحاً أكبر من صفر.',
    price: 'السعر الحالي', noPrice: 'بانتظار بيانات السوق…',
  },
  fr: {
    title: 'Alertes de prix', subtitle: 'Recevez une alerte lorsque le prix atteint le niveau choisi.',
    coin: 'Actif', condition: 'Condition', above: 'Lorsque le prix dépasse', below: 'Lorsque le prix passe sous',
    target: 'Prix cible (USD)', add: 'Ajouter une alerte', active: 'Active', paused: 'En pause',
    fired: 'Alerte déclenchée', remove: 'Supprimer', empty: 'Aucune alerte. Créez votre première alerte.',
    permission: 'Activer les notifications', granted: 'Notifications activées',
    denied: 'Notifications indisponibles ou refusées.',
    note: 'Alertes gratuites, stockées sur cet appareil. Elles fonctionnent lorsque le site est ouvert et actualise les données; aucune alerte lorsque le site est fermé. Ceci n’est pas un conseil financier.',
    invalid: 'Saisissez un prix cible valide supérieur à zéro.',
    price: 'Prix actuel', noPrice: 'En attente des données du marché…',
  },
  en: {
    title: 'Price alerts', subtitle: 'Create an alert for a price level you choose.',
    coin: 'Asset', condition: 'Condition', above: 'When price rises above', below: 'When price falls below',
    target: 'Target price (USD)', add: 'Add alert', active: 'Active', paused: 'Paused',
    fired: 'Alert triggered', remove: 'Delete', empty: 'No alerts yet. Create your first one.',
    permission: 'Enable browser notifications', granted: 'Browser notifications enabled',
    denied: 'Browser notifications are unavailable or blocked.',
    note: 'Free alerts stored on this device only. They work while this site is open and refreshing market data; no alerts are sent while the site is closed. Not investment advice.',
    invalid: 'Enter a valid target price greater than zero.',
    price: 'Current price', noPrice: 'Waiting for market data…',
  },
}

function loadAlerts(): AlertRule[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(value)) return []
    return value.filter((item): item is AlertRule =>
      item && typeof item.id === 'string' && typeof item.symbol === 'string' &&
      (item.direction === 'above' || item.direction === 'below') &&
      typeof item.target === 'number' && Number.isFinite(item.target) &&
      typeof item.active === 'boolean' && typeof item.fired === 'boolean',
    )
  } catch { return [] }
}

export default function AlertCenter({ tickers, lang }: Props) {
  const t = copy[lang]
  const [alerts, setAlerts] = useState<AlertRule[]>(loadAlerts)
  const [symbol, setSymbol] = useState('BTC')
  const [direction, setDirection] = useState<'above' | 'below'>('above')
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const permission = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  const prices = useMemo(() => new Map(tickers.map(row => [row.symbol.replace('USDT', ''), Number(row.lastPrice)])), [tickers])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts)) } catch { /* Local storage may be unavailable. */ }
  }, [alerts])

  useEffect(() => {
    if (!tickers.length) return
    setAlerts(previous => {
      let changed = false
      const next = previous.map(rule => {
        const price = prices.get(rule.symbol)
        if (!rule.active || rule.fired || price === undefined || !Number.isFinite(price)) return rule
        const hit = rule.direction === 'above' ? price >= rule.target : price <= rule.target
        if (!hit) return rule
        changed = true
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          try { new Notification('AI Crypto Rain', { body: rule.symbol + ' reached $' + price.toLocaleString('en-US') }) } catch { /* Browser may suppress notifications. */ }
        }
        return { ...rule, fired: true }
      })
      return changed ? next : previous
    })
  }, [tickers, prices])

  async function enableNotifications() {
    if (typeof Notification === 'undefined') { setNotice(t.denied); return }
    try {
      const result = await Notification.requestPermission()
      setNotice(result === 'granted' ? t.granted : t.denied)
    } catch { setNotice(t.denied) }
  }

  function addAlert(event: FormEvent) {
    event.preventDefault()
    const value = Number(target)
    if (!Number.isFinite(value) || value <= 0) { setError(t.invalid); return }
    setError('')
    setAlerts(old => [...old, { id: crypto.randomUUID(), symbol, direction, target: value, active: true, fired: false }])
    setTarget('')
  }

  const formatPrice = (value?: number) => value === undefined || !Number.isFinite(value)
    ? '—'
    : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value < 1 ? 6 : 2 }).format(value)

  return <section className="page-content">
    <div className="section-heading"><div><h2>{t.title}</h2><p>{t.subtitle}</p></div><span className="ai-badge"><BellRing size={16}/> {alerts.length}</span></div>
    <section className="panel alert-panel">
      <form className="alert-form" onSubmit={addAlert}>
        <label>{t.coin}<select value={symbol} onChange={e => setSymbol(e.target.value)}>{(tickers.length ? tickers : [{symbol:'BTCUSDT',lastPrice:'',priceChangePercent:'',quoteVolume:''}]).map(row => <option key={row.symbol} value={row.symbol.replace('USDT','')}>{row.symbol.replace('USDT','')}</option>)}</select></label>
        <label>{t.condition}<select value={direction} onChange={e => setDirection(e.target.value as 'above' | 'below')}><option value="above">{t.above}</option><option value="below">{t.below}</option></select></label>
        <label>{t.target}<input inputMode="decimal" type="number" min="0" step="any" value={target} onChange={e => setTarget(e.target.value)} placeholder="70000" /></label>
        <button className="button-primary" type="submit"><Plus size={16}/>{t.add}</button>
      </form>
      {error && <p className="alert-error" role="alert">{error}</p>}
      <div className="alert-list">
        {!alerts.length && <div className="state-message">{t.empty}</div>}
        {alerts.map(rule => <div className="alert-row" key={rule.id}>
          <div className="alert-main"><b>{rule.symbol}</b><span>{rule.direction === 'above' ? '≥' : '≤'} {formatPrice(rule.target)}</span><small>{t.price}: {formatPrice(prices.get(rule.symbol))}</small></div>
          <span className={rule.fired ? 'alert-status fired' : rule.active ? 'alert-status active' : 'alert-status'}>{rule.fired ? t.fired : rule.active ? t.active : t.paused}</span>
          <button className="star-button" type="button" aria-label={rule.active ? t.paused : t.active} onClick={() => setAlerts(old => old.map(item => item.id === rule.id ? { ...item, active: !item.active, fired: false } : item))}>{rule.active ? <Bell size={17}/> : <BellRing size={17}/>}</button>
          <button className="star-button" type="button" aria-label={t.remove} onClick={() => setAlerts(old => old.filter(item => item.id !== rule.id))}><Trash2 size={17}/></button>
        </div>)}
      </div>
      <div className="alert-permission">
        <button className="button-ghost" type="button" onClick={enableNotifications}><Bell size={16}/>{permission === 'granted' ? t.granted : t.permission}</button>
        {notice && <span>{notice}</span>}
      </div>
      <p className="data-note"><Bell size={15}/>{t.note}</p>
    </section>
  </section>
}
