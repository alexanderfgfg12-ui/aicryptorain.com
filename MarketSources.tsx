import { useEffect, useState } from 'react'
import { Activity, RefreshCw, ShieldCheck } from 'lucide-react'
import type { Lang } from './i18n'

type AssetKey = 'BTC' | 'ETH' | 'BNB' | 'SOL' | 'XRP' | 'ADA' | 'DOGE' | 'TRX'
type Quote = { price: number; change?: number; marketCap?: number; volume?: number }
type SourceState = { quotes: Partial<Record<AssetKey, Quote>>; updated: Date | null; error: boolean }
const assets: { key: AssetKey; name: string; gecko: string; paprika: string; binance: string }[] = [
  { key: 'BTC', name: 'Bitcoin', gecko: 'bitcoin', paprika: 'btc-bitcoin', binance: 'BTCUSDT' },
  { key: 'ETH', name: 'Ethereum', gecko: 'ethereum', paprika: 'eth-ethereum', binance: 'ETHUSDT' },
  { key: 'BNB', name: 'BNB', gecko: 'binancecoin', paprika: 'bnb-binance-coin', binance: 'BNBUSDT' },
  { key: 'SOL', name: 'Solana', gecko: 'solana', paprika: 'sol-solana', binance: 'SOLUSDT' },
  { key: 'XRP', name: 'XRP', gecko: 'ripple', paprika: 'xrp-xrp', binance: 'XRPUSDT' },
  { key: 'ADA', name: 'Cardano', gecko: 'cardano', paprika: 'ada-cardano', binance: 'ADAUSDT' },
  { key: 'DOGE', name: 'Dogecoin', gecko: 'dogecoin', paprika: 'doge-dogecoin', binance: 'DOGEUSDT' },
  { key: 'TRX', name: 'TRON', gecko: 'tron', paprika: 'trx-tron', binance: 'TRXUSDT' },
]
const empty: SourceState = { quotes: {}, updated: null, error: false }
const usd = (n: number, lang: Lang) => new Intl.NumberFormat(lang === 'ar' ? 'en-US' : lang, { style: 'currency', currency: 'USD', maximumFractionDigits: n < 1 ? 6 : 2 }).format(n)
const pct = (n?: number) => n === undefined ? '—' : `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`

export default function MarketSources({ lang }: { lang: Lang }) {
  const [binance, setBinance] = useState<SourceState>(empty)
  const [gecko, setGecko] = useState<SourceState>(empty)
  const [paprika, setPaprika] = useState<SourceState>(empty)
  const [loading, setLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  const ar = lang === 'ar'
  const labels = ar
    ? { title: 'مقارنة الأسعار من مصادر متعددة', subtitle: 'قارن الأسعار المرجعية بين منصات ومجمّعات بيانات مستقلة', source: 'المصدر', price: 'السعر بالدولار', change: 'تغير 24 ساعة', updated: 'آخر تحديث', unavailable: 'غير متاح حالياً', note: 'قد تختلف الأسعار بسبب اختلاف أزواج التداول وطرق التجميع وتوقيت التحديث. البيانات للمعلومات فقط.' }
    : lang === 'fr'
      ? { title: 'Comparaison multi-sources', subtitle: 'Comparez les prix de référence entre plateformes et agrégateurs indépendants', source: 'Source', price: 'Prix USD', change: 'Variation 24 h', updated: 'Mis à jour', unavailable: 'Indisponible', note: 'Les écarts peuvent venir des paires, des méthodes d’agrégation et des horaires de mise à jour. Données informatives uniquement.' }
      : { title: 'Multi-source price comparison', subtitle: 'Compare reference prices across independent exchanges and market-data aggregators', source: 'Source', price: 'USD price', change: '24h change', updated: 'Last updated', unavailable: 'Currently unavailable', note: 'Differences may reflect trading pairs, aggregation methods, and update timing. Informational data only.' }

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      const tasks = await Promise.allSettled([
        fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%2C%22BNBUSDT%22%2C%22SOLUSDT%22%2C%22XRPUSDT%22%2C%22ADAUSDT%22%2C%22DOGEUSDT%22%2C%22TRXUSDT%22%5D', { cache: 'no-store' }).then(async r => { if (!r.ok) throw new Error('Binance'); return r.json() as Promise<{symbol:string;lastPrice:string;priceChangePercent:string}[]> }),
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin%2Cethereum%2Cbinancecoin%2Csolana%2Cripple%2Ccardano%2Cdogecoin%2Ctron&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true', { cache: 'no-store' }).then(async r => { if (!r.ok) throw new Error('CoinGecko'); return r.json() as Promise<Record<string,{usd?:number;usd_24h_change?:number;usd_market_cap?:number;usd_24h_vol?:number}>> }),
        fetch('https://api.coinpaprika.com/v1/tickers?quotes=USD', { cache: 'no-store' }).then(async r => { if (!r.ok) throw new Error('CoinPaprika'); return r.json() as Promise<{id:string;quotes?:{USD?:{price?:number;percent_change_24h?:number;market_cap?:number;volume_24h?:number}}}[]> }),
      ])
      if (!active) return
      const [b, g, p] = tasks
      if (b.status === 'fulfilled') {
        const q: SourceState['quotes'] = {}
        for (const row of b.value) { const a = assets.find(x => x.binance === row.symbol); if (a) q[a.key] = { price: Number(row.lastPrice), change: Number(row.priceChangePercent) } }
        setBinance({ quotes: q, updated: new Date(), error: false })
      } else setBinance(old => ({ ...old, error: true }))
      if (g.status === 'fulfilled') {
        const q: SourceState['quotes'] = {}
        for (const a of assets) { const row = g.value[a.gecko]; if (row?.usd) q[a.key] = { price: row.usd, change: row.usd_24h_change, marketCap: row.usd_market_cap, volume: row.usd_24h_vol } }
        setGecko({ quotes: q, updated: new Date(), error: false })
      } else setGecko(old => ({ ...old, error: true }))
      if (p.status === 'fulfilled') {
        const q: SourceState['quotes'] = {}
        for (const a of assets) { const row = p.value.find(x => x.id === a.paprika); const v = row?.quotes?.USD; if (v?.price) q[a.key] = { price: v.price, change: v.percent_change_24h, marketCap: v.market_cap, volume: v.volume_24h } }
        setPaprika({ quotes: q, updated: new Date(), error: false })
      } else setPaprika(old => ({ ...old, error: true }))
      setLoading(false)
    }
    void load()
    const timer = window.setInterval(load, 90_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [refresh])

  const sources = [
    { name: 'Binance', data: binance, detail: ar ? 'أسعار أزواج التداول' : lang === 'fr' ? 'Prix des paires de trading' : 'Exchange trading pairs' },
    { name: 'CoinGecko', data: gecko, detail: ar ? 'تجميع من أسواق متعددة' : lang === 'fr' ? 'Agrégation multi-marchés' : 'Multi-market aggregation' },
    { name: 'CoinPaprika', data: paprika, detail: ar ? 'مرجع مستقل للسوق' : lang === 'fr' ? 'Référence indépendante' : 'Independent market reference' },
  ]
  return <section className="panel multi-source-panel">
    <div className="panel-heading"><div><h3>{labels.title}</h3><p>{labels.subtitle}</p></div><button className="icon-button" onClick={() => setRefresh(x => x + 1)} aria-label={ar ? 'تحديث' : 'Refresh'}><RefreshCw size={17} className={loading ? 'spin' : ''}/></button></div>
    <div className="source-status-grid">{sources.map(s => <div className="source-status" key={s.name}><div><b>{s.name}</b><span>{s.detail}</span></div><span className={s.data.error ? 'source-offline' : 'source-online'}>{s.data.error ? labels.unavailable : s.data.updated ? '● Online' : loading ? '…' : labels.unavailable}</span></div>)}</div>
    <div className="table-scroll"><table><thead><tr><th>Asset</th>{sources.map(s => <th key={s.name}>{s.name} · USD</th>)}</tr></thead><tbody>
      {assets.map(a => <tr key={a.key}><td><b>{a.key}</b><span className="muted"> / {a.name}</span></td>{sources.map(s => { const q = s.data.quotes[a.key]; return <td key={s.name} className="number-cell">{q ? <><b>{usd(q.price, lang)}</b><small className={q.change === undefined ? '' : q.change >= 0 ? 'positive' : 'negative'}>{pct(q.change)}</small></> : '—'}</td> })}</tr>)}
    </tbody></table></div>
    <div className="multi-source-foot"><ShieldCheck size={15}/><span>{labels.note}</span><span>{labels.updated}: {([binance,gecko,paprika].filter(x=>x.updated).map(x=>x.updated!.toLocaleTimeString(lang==='ar'?'en-US':lang))).join(' · ') || '—'}</span></div>
  </section>
}
