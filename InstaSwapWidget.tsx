import { useEffect, useRef, useState } from 'react'

type WidgetOptions = {
  affiliateId: string
  type: 'static'
  sellAsset: string
  buyAsset: string
  sellAmount: string
}

declare global {
  interface Window {
    InstaswapWidget?: {
      init?: (options: WidgetOptions) => void
    }
  }
}

const affiliateId = import.meta.env.VITE_INSTASWAP_AFFILIATE_ID || '0X0PUTVJ'

export default function InstaSwapWidget({ lang }: { lang: 'ar' | 'fr' | 'en' }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    const initialize = () => {
      if (cancelled || !containerRef.current) return
      if (typeof window.InstaswapWidget?.init !== 'function') {
        setError(true)
        return
      }
      window.InstaswapWidget.init({
        affiliateId,
        type: 'static',
        sellAsset: 'BTC.BTC',
        buyAsset: 'ETH.ETH',
        sellAmount: '1',
      })
    }

    let script = document.querySelector<HTMLScriptElement>('script[data-acr-instaswap]')
    if (window.InstaswapWidget?.init) {
      initialize()
    } else {
      if (!script) {
        script = document.createElement('script')
        script.src = 'https://web.instaswap.com/widget.js'
        script.async = true
        script.dataset.acrInstaswap = 'true'
        document.head.appendChild(script)
      }
      const onLoad = initialize
      const onError = () => { if (!cancelled) setError(true) }
      script.addEventListener('load', onLoad)
      script.addEventListener('error', onError)
      return () => {
        cancelled = true
        script?.removeEventListener('load', onLoad)
        script?.removeEventListener('error', onError)
      }
    }

    return () => { cancelled = true }
  }, [])

  return (
    <div className="instaswap-embed-shell">
      <div id="instaswap-widget-container" ref={containerRef} />
      {error && (
        <div className="instaswap-embed-error" role="alert">
          <p>{lang === 'ar' ? 'تعذر تحميل ويدجت InstaSwap. تحقق من اتصالك أو من تفعيل النطاق لدى InstaSwap.' : lang === 'fr' ? 'Le widget InstaSwap n’a pas pu être chargé. Vérifiez votre connexion et l’autorisation du domaine.' : 'The InstaSwap widget could not load. Check your connection and domain allow-list.'}</p>
          <a href="https://app.instaswap.com" target="_blank" rel="noopener noreferrer">{lang === 'ar' ? 'فتح InstaSwap' : lang === 'fr' ? 'Ouvrir InstaSwap' : 'Open InstaSwap'}</a>
        </div>
      )}
    </div>
  )
}
