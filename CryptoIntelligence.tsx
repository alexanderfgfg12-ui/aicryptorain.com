import { useMemo } from 'react'
import { Activity, BookOpen, ExternalLink, Search, ShieldCheck } from 'lucide-react'

type Lang = 'ar' | 'fr' | 'en'
type Ticker = { symbol: string; lastPrice: string; priceChangePercent: string; quoteVolume: string }

const copy = {
  en: {
    market: 'Market snapshot', marketDesc: 'Public 24-hour market data already available on the site. Figures are indicative and may be delayed.',
    assets: 'Tracked assets', gainers: 'Largest 24h move', volume: 'Highest quoted volume',
    research: 'Independent research sources', researchDesc: 'Open external sources to verify project data. AI Crypto Rain does not endorse listed assets.',
    learn: 'Research and learning', learnDesc: 'A practical starting point for understanding crypto projects without connecting a wallet.',
    basics: 'Understand the basics', basicsText: 'Learn how blockchains, tokens, wallets, transaction fees and consensus mechanisms work before evaluating a project.',
    verify: 'Verify a project', verifyText: 'Check the official website, contract address, token distribution, unlock schedule, liquidity and independent documentation.',
    risks: 'Recognize common risks', risksText: 'Watch for impersonation, unaudited contracts, concentrated ownership, thin liquidity, unrealistic claims and fake endorsements.',
    disclaimer: 'Educational information only. Market data can be incomplete or delayed. Nothing on this page is investment, legal or tax advice, a recommendation, or a promise of performance. Always verify information independently.',
    loading: 'Loading public market data…', unavailable: 'Market data is temporarily unavailable.', noData: 'No market data available yet.',
    source1: 'CoinGecko', source1d: 'Market data, asset profiles and reference information.',
    source2: 'DefiLlama', source2d: 'DeFi protocol metrics, TVL and ecosystem dashboards.',
    source3: 'Base ecosystem', source3d: 'Official network information and developer resources.',
    source4: 'Etherscan', source4d: 'Public on-chain transactions and contract verification.',
    source5: 'CoinMarketCap', source5d: 'Market listings, project descriptions and market metrics.',
    source6: 'Crypto Scams (FTC)', source6d: 'Consumer guidance on common cryptocurrency scams.',
    open: 'Open source', noWallet: 'No wallet connection', noTransactions: 'No trades or transactions', noCustody: 'No custody or private keys',
  },
  ar: {
    market: 'لمحة عن السوق', marketDesc: 'بيانات عامة لحركة السوق خلال 24 ساعة متاحة حالياً على الموقع. قد تكون الأرقام متأخرة أو تقريبية.',
    assets: 'الأصول المتابعة', gainers: 'أكبر تغير خلال 24 ساعة', volume: 'أعلى حجم تداول مقتبس',
    research: 'مصادر بحث مستقلة', researchDesc: 'استخدم المصادر الخارجية للتحقق من بيانات المشاريع. لا تقدم AI Crypto Rain تزكية للعملات المدرجة.',
    learn: 'البحث والتعلّم', learnDesc: 'خطوات عملية لفهم مشاريع العملات الرقمية دون ربط محفظة.',
    basics: 'فهم الأساسيات', basicsText: 'تعرّف على البلوكشين والرموز والمحافظ ورسوم المعاملات وآليات الإجماع قبل تقييم أي مشروع.',
    verify: 'التحقق من المشروع', verifyText: 'راجع الموقع الرسمي وعنوان العقد وتوزيع الرموز ومواعيد فتح القفل والسيولة والوثائق المستقلة.',
    risks: 'التعرّف على المخاطر الشائعة', risksText: 'انتبه إلى انتحال الهوية والعقود غير المدققة وتركيز الملكية وضعف السيولة والوعود غير الواقعية والتوصيات المزيفة.',
    disclaimer: 'معلومات تعليمية فقط. قد تكون بيانات السوق ناقصة أو متأخرة. لا تمثل محتويات هذه الصفحة نصيحة استثمارية أو قانونية أو ضريبية، ولا توصية أو ضماناً للأداء. تحقق دائماً من المعلومات بنفسك.',
    loading: 'جارٍ تحميل بيانات السوق العامة…', unavailable: 'بيانات السوق غير متاحة مؤقتاً.', noData: 'لا توجد بيانات سوق متاحة حالياً.',
    source1: 'CoinGecko', source1d: 'بيانات السوق وملفات الأصول والمعلومات المرجعية.',
    source2: 'DefiLlama', source2d: 'مؤشرات بروتوكولات التمويل اللامركزي والقيمة الإجمالية المقفلة.',
    source3: 'منظومة Base', source3d: 'معلومات الشبكة الرسمية وموارد المطورين.',
    source4: 'Etherscan', source4d: 'معاملات البلوكشين العامة والتحقق من العقود.',
    source5: 'CoinMarketCap', source5d: 'قوائم السوق ووصف المشاريع ومؤشرات السوق.',
    source6: 'Crypto Scams (FTC)', source6d: 'إرشادات المستهلك حول عمليات الاحتيال الشائعة.',
    open: 'فتح المصدر', noWallet: 'لا حاجة لربط محفظة', noTransactions: 'لا تداول ولا معاملات', noCustody: 'لا حفظ للأموال أو المفاتيح',
  },
  fr: {
    market: 'Aperçu du marché', marketDesc: 'Données publiques sur 24 heures déjà disponibles sur le site. Les chiffres peuvent être indicatifs ou retardés.',
    assets: 'Actifs suivis', gainers: 'Plus forte variation sur 24 h', volume: 'Volume coté le plus élevé',
    research: 'Sources de recherche indépendantes', researchDesc: 'Vérifiez les données auprès de sources externes. AI Crypto Rain ne cautionne aucun actif.',
    learn: 'Recherche et apprentissage', learnDesc: 'Un point de départ pratique pour comprendre les projets crypto sans connecter de portefeuille.',
    basics: 'Comprendre les bases', basicsText: 'Comprenez les blockchains, les jetons, les portefeuilles, les frais et les mécanismes de consensus.',
    verify: 'Vérifier un projet', verifyText: 'Vérifiez le site officiel, l’adresse du contrat, la distribution, les déblocages, la liquidité et la documentation.',
    risks: 'Identifier les risques', risksText: 'Méfiez-vous de l’usurpation, des contrats non audités, de la propriété concentrée, de la faible liquidité et des promesses irréalistes.',
    disclaimer: 'Informations éducatives uniquement. Les données peuvent être incomplètes ou retardées. Aucun conseil en investissement, juridique ou fiscal, aucune recommandation ni garantie de performance.',
    loading: 'Chargement des données publiques…', unavailable: 'Données du marché temporairement indisponibles.', noData: 'Aucune donnée de marché disponible.',
    source1: 'CoinGecko', source1d: 'Données de marché et profils des actifs.',
    source2: 'DefiLlama', source2d: 'Indicateurs DeFi, TVL et tableaux de bord.',
    source3: 'Écosystème Base', source3d: 'Informations officielles et ressources développeurs.',
    source4: 'Etherscan', source4d: 'Transactions publiques et vérification des contrats.',
    source5: 'CoinMarketCap', source5d: 'Listes de marché et indicateurs.',
    source6: 'Crypto Scams (FTC)', source6d: 'Conseils aux consommateurs sur les escroqueries crypto.',
    open: 'Ouvrir la source', noWallet: 'Aucun portefeuille requis', noTransactions: 'Aucun échange ni transaction', noCustody: 'Aucune conservation de fonds ou de clés',
  },
}

const sources = [
  { key: 'source1', desc: 'source1d', url: 'https://www.coingecko.com/' },
  { key: 'source2', desc: 'source2d', url: 'https://defillama.com/' },
  { key: 'source3', desc: 'source3d', url: 'https://www.base.org/' },
  { key: 'source4', desc: 'source4d', url: 'https://etherscan.io/' },
  { key: 'source5', desc: 'source5d', url: 'https://coinmarketcap.com/' },
  { key: 'source6', desc: 'source6d', url: 'https://consumer.ftc.gov/articles/what-know-about-cryptocurrency-and-scams' },
] as const

function formatPrice(value: string) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: n < 1 ? 6 : 2 }).format(n)
}
function formatCompact(value: string) {
  const n = Number(value)
  return Number.isFinite(n) ? new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n) : '—'
}

export default function CryptoIntelligence({ lang, tickers, loading, error }: { lang: Lang; tickers: Ticker[]; loading: boolean; error: boolean }) {
  const t = copy[lang]
  const sorted = useMemo(() => [...tickers].sort((a, b) => Number(b.quoteVolume) - Number(a.quoteVolume)), [tickers])
  const largestMove = useMemo(() => [...tickers].sort((a, b) => Math.abs(Number(b.priceChangePercent)) - Math.abs(Number(a.priceChangePercent)))[0], [tickers])
  const topVolume = sorted[0]
  return <section className="crypto-intel">
    <div className="intel-overview">
      <div className="intel-stat"><span>{t.assets}</span><strong>{tickers.length || '—'}</strong></div>
      <div className="intel-stat"><span>{t.gainers}</span><strong>{largestMove ? `${largestMove.symbol.replace('USDT', '')} ${Number(largestMove.priceChangePercent) > 0 ? '+' : ''}${Number(largestMove.priceChangePercent).toFixed(2)}%` : '—'}</strong></div>
      <div className="intel-stat"><span>{t.volume}</span><strong>{topVolume ? `${topVolume.symbol.replace('USDT', '')} · $${formatCompact(topVolume.quoteVolume)}` : '—'}</strong></div>
    </div>
    <section className="panel intel-section">
      <div className="intel-section-head"><div><h3><Activity size={17} style={{display:'inline',verticalAlign:'-3px',marginInlineEnd:7}}/>{t.market}</h3><p>{t.marketDesc}</p></div></div>
      {loading ? <p className="data-note">{t.loading}</p> : error ? <p className="data-note">{t.unavailable}</p> : sorted.length ? <div className="intel-market-list">
        {sorted.map(item => {
          const change = Number(item.priceChangePercent)
          return <div className="intel-market-row" key={item.symbol}><span className="intel-market-symbol">{item.symbol.replace('USDT', '')}</span><span className="intel-market-price">{formatPrice(item.lastPrice)}</span><span className={`intel-market-change ${change >= 0 ? 'intel-positive' : 'intel-negative'}`}>{change > 0 ? '+' : ''}{change.toFixed(2)}%</span></div>
        })}
      </div> : <p className="data-note">{t.noData}</p>}
    </section>
    <section className="panel intel-section">
      <div className="intel-section-head"><div><h3><Search size={17} style={{display:'inline',verticalAlign:'-3px',marginInlineEnd:7}}/>{t.research}</h3><p>{t.researchDesc}</p></div></div>
      <div className="intel-links">
        {sources.map(source => <a className="intel-link-card" key={source.key} href={source.url} target="_blank" rel="noopener noreferrer"><b>{t[source.key]}</b><span>{t[source.desc]}</span><small>{t.open} <ExternalLink size={12} style={{display:'inline',verticalAlign:'-2px'}}/></small></a>)}
      </div>
    </section>
    <section className="panel intel-section">
      <div className="intel-section-head"><div><h3><BookOpen size={17} style={{display:'inline',verticalAlign:'-3px',marginInlineEnd:7}}/>{t.learn}</h3><p>{t.learnDesc}</p></div></div>
      <div className="intel-learning-grid">
        <article className="intel-learning-card"><b>{t.basics}</b><p>{t.basicsText}</p></article>
        <article className="intel-learning-card"><b>{t.verify}</b><p>{t.verifyText}</p></article>
        <article className="intel-learning-card"><b>{t.risks}</b><p>{t.risksText}</p></article>
      </div>
    </section>
    <div className="intel-disclaimer"><ShieldCheck size={15} style={{display:'inline',verticalAlign:'-3px',marginInlineEnd:7}}/>{t.disclaimer}</div>
  </section>
}
