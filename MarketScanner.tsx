import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Search, ShieldAlert } from 'lucide-react'

type Ticker = {
  symbol: string
  lastPrice: string
  priceChangePercent: string
  quoteVolume: string
}

type Props = { tickers: Ticker[]; loading: boolean; lang: 'ar' | 'fr' | 'en' }

const money = (value: number) => new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', maximumFractionDigits: value < 1 ? 6 : 2,
}).format(value)

const copy = {
  ar: {
    title: 'ماسح السوق', subtitle: 'ترتيب الأصول حسب حركة آخر 24 ساعة وحجم التداول المعلن.',
    all: 'الكل', gainers: 'الأعلى ارتفاعاً', losers: 'الأعلى انخفاضاً',
    asset: 'الأصل', price: 'السعر', change: 'التغير 24س', volume: 'حجم التداول 24س',
    search: 'ابحث عن عملة…', loading: 'جارٍ تحميل بيانات السوق…', empty: 'لا توجد نتائج مطابقة.',
    note: 'الماسح يعرض بيانات سوق تاريخية قصيرة (24 ساعة) فقط. لا يستخدم مؤشرات فنية ولا يتنبأ بالسعر ولا يقدم توصية تداول.',
  },
  fr: {
    title: 'Scanner de marché', subtitle: 'Classement selon la variation et le volume déclarés sur 24 h.',
    all: 'Tout', gainers: 'Plus fortes hausses', losers: 'Plus fortes baisses',
    asset: 'Actif', price: 'Prix', change: 'Variation 24 h', volume: 'Volume 24 h',
    search: 'Rechercher un actif…', loading: 'Chargement des données…', empty: 'Aucun résultat.',
    note: 'Ce scanner affiche uniquement des données de marché sur 24 h. Il ne prédit pas les prix et ne fournit aucun conseil de trading.',
  },
  en: {
    title: 'Market scanner', subtitle: 'Rank assets by reported 24-hour price movement and trading volume.',
    all: 'All', gainers: 'Top gainers', losers: 'Top losers',
    asset: 'Asset', price: 'Price', change: '24h change', volume: '24h volume',
    search: 'Search assets…', loading: 'Loading market data…', empty: 'No matching assets.',
    note: 'This scanner shows reported 24-hour market data only. It does not use technical indicators, predict prices, or provide trading advice.',
  },
}

export default function MarketScanner({ tickers, loading, lang }: Props) {
  const [filter, setFilter] = useState<'all' | 'up' | 'down'>('all')
  const [query, setQuery] = useState('')
  const t = copy[lang]
  const rows = useMemo(() => tickers
    .filter(row => row.symbol.replace('USDT', '').toLowerCase().includes(query.trim().toLowerCase()))
    .filter(row => filter === 'all' || (filter === 'up' ? Number(row.priceChangePercent) >= 0 : Number(row.priceChangePercent) < 0))
    .sort((a, b) => filter === 'down'
      ? Number(a.priceChangePercent) - Number(b.priceChangePercent)
      : Number(b.priceChangePercent) - Number(a.priceChangePercent)),
  [tickers, filter, query])

  return <section className="page-content">
    <div className="section-heading">
      <div><h2>{t.title}</h2><p>{t.subtitle}</p></div>
      <div className="search-box"><Search size={17}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder={t.search}/></div>
    </div>
    <section className="panel market-table-panel">
      <div className="scanner-filters" role="group" aria-label={t.title}>
        <button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>{t.all}</button>
        <button className={filter === 'up' ? 'selected' : ''} onClick={() => setFilter('up')}>{t.gainers}</button>
        <button className={filter === 'down' ? 'selected' : ''} onClick={() => setFilter('down')}>{t.losers}</button>
      </div>
      {loading ? <div className="state-message">{t.loading}</div> : <div className="table-scroll">
        <table><thead><tr><th>{t.asset}</th><th>{t.price}</th><th>{t.change}</th><th>{t.volume}</th></tr></thead>
          <tbody>{rows.map(row => {
            const symbol = row.symbol.replace('USDT', '')
            const change = Number(row.priceChangePercent)
            const volume = Number(row.quoteVolume)
            return <tr key={row.symbol}>
              <td><b>{symbol}</b><span className="muted"> / USDT</span></td>
              <td className="number-cell">{money(Number(row.lastPrice))}</td>
              <td><span className={`change-chip ${change >= 0 ? 'positive' : 'negative'}`}>{change >= 0 ? <ArrowUpRight size={13}/> : <ArrowDownRight size={13}/>}{change > 0 ? '+' : ''}{change.toFixed(2)}%</span></td>
              <td className="number-cell">{Number.isFinite(volume) ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2, style: 'currency', currency: 'USD' }).format(volume) : '—'}</td>
            </tr>
          })}{!rows.length && <tr><td colSpan={4} className="empty-cell">{t.empty}</td></tr>}</tbody>
        </table>
      </div>}
      <p className="data-note"><ShieldAlert size={15}/>{t.note}</p>
    </section>
  </section>
}
