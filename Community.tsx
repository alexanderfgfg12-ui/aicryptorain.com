import { useEffect, useState, type FormEvent } from 'react'
import { onAuthStateChanged, setPersistence, inMemoryPersistence, signInAnonymously, type User } from 'firebase/auth'
import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { communityAuth, communityDb as db } from './firebase'
import type { Lang } from './i18n'
import { containsSensitiveData } from './communityModeration'

type Message = {
  id: string
  character: string
  avatar: string
  body: string
  createdAt?: { toDate?: () => Date } | null
}

const characters = [
  { name: 'شبح ساتوشي', avatar: '👻' },
  { name: 'ثعلب الشارت', avatar: '🦊' },
  { name: 'قطة البلوكتشين', avatar: '🐱' },
  { name: 'روبوت المطر', avatar: '🤖' },
  { name: 'نينجا أخضر', avatar: '🥷' },
  { name: 'بطريق الكريبتو', avatar: '🐧' },
  { name: 'فضائي الميمز', avatar: '👽' },
  { name: 'تنين الدوج', avatar: '🐉' },
]

const copy = {
  ar: {
    title: 'CryptoCommunity Anonymous', subtitle: 'مساحة مستعارة للنقاشات الخفيفة وشخصيات الكريبتو الخيالية والميمز النصية.',
    compose: 'اكتب تعليقك أو الميم النصي…', publish: 'إرسال التعليق', loading: 'جارٍ تحميل التعليقات…',
    empty: 'لا توجد تعليقات بعد. ابدأ أول نقاش!', joining: 'جارٍ إنشاء جلسة مجهولة…',
    error: 'تعذر تنفيذ العملية. تحقق من إعداد Firebase وقواعد Firestore.',
    count: 'تعليق', choose: 'اختر شخصيتك الخيالية', rules: 'نص فقط: لا صور، لا ملفات، لا روابط، لا رسائل خاصة.',
    privacy: 'لا نطلب بريداً إلكترونياً أو كلمة مرور. تستخدم الجلسة حساب Firebase مجهولاً بمعرّف عشوائي؛ هذا يخفي هويتك عن بقية الأعضاء لكنه ليس إخفاءً كاملاً عن مزود الخدمة.',
    sensitive: 'تم رفض التعليق: لا تنشر أسماء حقيقية أو بيانات اتصال أو هوية أو معلومات مالية أو كلمات مرور أو مفاتيح أو عناوين محافظ أو روابط.',
    max: 'الحد الأقصى 500 حرف.', rateLimit: 'انتظر قليلاً قبل إرسال تعليق آخر.', report: 'إبلاغ عن تعليق', reported: 'تم الإبلاغ', reporting: 'جارٍ الإبلاغ…', delete: 'حذف تعليقي',
  },
  fr: {
    title: 'CryptoCommunity Anonymous', subtitle: 'Un espace pseudonyme pour discuter, jouer des personnages fictifs et partager des mèmes textuels.',
    compose: 'Écrivez votre commentaire ou mème textuel…', publish: 'Envoyer', loading: 'Chargement des commentaires…',
    empty: 'Aucun commentaire. Lancez la discussion !', joining: 'Création d’une session anonyme…',
    error: 'Action impossible. Vérifiez Firebase et les règles Firestore.',
    count: 'commentaire', choose: 'Choisissez votre personnage fictif', rules: 'Texte uniquement : aucune image, pièce jointe, URL ou messagerie privée.',
    privacy: 'Aucun e-mail ni mot de passe demandé. La session utilise un compte Firebase anonyme avec un identifiant aléatoire. Cela vous pseudonymise auprès des autres membres, mais pas totalement auprès du fournisseur.',
    sensitive: 'Commentaire bloqué : ne publiez pas de nom réel, coordonnées, données d’identité ou financières, mots de passe, clés, adresses de portefeuille ou liens.',
    max: '500 caractères maximum.', rateLimit: 'Veuillez patienter avant un autre commentaire.', report: 'Signaler', reported: 'Signalé', reporting: 'Envoi…', delete: 'Supprimer mon commentaire',
  },
  en: {
    title: 'CryptoCommunity Anonymous', subtitle: 'A pseudonymous space for casual discussion, fictional crypto characters and text memes.',
    compose: 'Write a comment or text meme…', publish: 'Send comment', loading: 'Loading comments…',
    empty: 'No comments yet. Start the conversation!', joining: 'Creating an anonymous session…',
    error: 'Could not complete the action. Check Firebase and Firestore rules.',
    count: 'comments', choose: 'Choose your fictional character', rules: 'Text only: no images, files, links or private messages.',
    privacy: 'No email or password is requested. The session uses an anonymous Firebase account with a random identifier. This hides your identity from other members, but not completely from the service provider.',
    sensitive: 'Blocked: do not post real names, contact or identity details, financial data, passwords, keys, wallet addresses or links.',
    max: '500 characters maximum.', rateLimit: 'Please wait before posting another comment.', report: 'Report comment', reported: 'Reported', reporting: 'Reporting…', delete: 'Delete my comment',
  },
} as const

export default function Community({ lang }: {
  user: User | null
  lang: Lang
  onResendVerification: () => Promise<void>
  onRefreshUser: () => Promise<void>
}) {
  const t = copy[lang]
  const [anonUser, setAnonUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(0)
  const [reporting, setReporting] = useState<string | null>(null)
  const [reportedIds, setReportedIds] = useState<string[]>([])
  const [myMessageIds, setMyMessageIds] = useState<string[]>([])
  const [lastPublishedAt, setLastPublishedAt] = useState(0)
  const character = characters[selected]
  const localizedCharacters = characters

  useEffect(() => {
    const auth = communityAuth
    if (!auth) { setReady(true); setLoading(false); return }
    let alive = true
    let unsubscribe: (() => void) | undefined
    const start = async () => {
      try {
        await setPersistence(auth, inMemoryPersistence)
        unsubscribe = onAuthStateChanged(auth, current => {
          if (!alive) return
          setAnonUser(current?.isAnonymous ? current : null)
          setReady(true)
          if (!current) void signInAnonymously(auth).catch(() => { if (alive) setError(t.error) })
        })
      } catch { if (alive) { setReady(true); setLoading(false); setError(t.error) } }
    }
    void start()
    return () => { alive = false; unsubscribe?.() }
  }, [t.error])

  useEffect(() => {
    if (!db) { setLoading(false); return }
    const feed = query(collection(db, 'communityMessages'), orderBy('createdAt', 'desc'), limit(60))
    return onSnapshot(feed, snapshot => {
      setMessages(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Message)))
      setLoading(false)
      setError('')
    }, () => { setLoading(false); setError(t.error) })
  }, [t.error])

  const publish = async (event: FormEvent) => {
    event.preventDefault()
    const text = body.trim()
    if (!db || !anonUser?.isAnonymous || !text || text.length > 500 || busy) return
    if (Date.now() - lastPublishedAt < 5000) { setError(t.rateLimit); return }
    if (containsSensitiveData(text) || /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|net|org|io|me|co)\b)/i.test(text)) {
      setError(t.sensitive)
      return
    }
    setBusy(true); setError('')
    try {
      const messageRef = doc(collection(db, 'communityMessages'))
      const ownerRef = doc(db, 'communityMessageOwners', messageRef.id)
      const batch = writeBatch(db)
      batch.set(messageRef, { character: character.name, avatar: character.avatar, body: text, createdAt: serverTimestamp() })
      batch.set(ownerRef, { ownerUid: anonUser.uid, createdAt: serverTimestamp() })
      await batch.commit()
      setMyMessageIds(current => [...current, messageRef.id])
      setBody('')
      setLastPublishedAt(Date.now())
    } catch { setError(t.error) } finally { setBusy(false) }
  }


  const reportMessage = async (messageId: string) => {
    if (!db || !anonUser?.isAnonymous || reportedIds.includes(messageId) || reporting) return
    setReporting(messageId); setError('')
    try {
      const reportId = `${messageId}_${anonUser.uid}`
      await setDoc(doc(db, 'communityReports', reportId), {
        messageId, reporterUid: anonUser.uid, reason: 'personal_data_or_abuse', createdAt: serverTimestamp(),
      })
      setReportedIds(current => [...current, messageId])
    } catch { setError(t.error) } finally { setReporting(null) }
  }

  const deleteOwnMessage = async (messageId: string) => {
    if (!db || !anonUser?.isAnonymous || !myMessageIds.includes(messageId)) return
    try {
      const batch = writeBatch(db)
      batch.delete(doc(db, 'communityMessages', messageId))
      batch.delete(doc(db, 'communityMessageOwners', messageId))
      await batch.commit()
      setMyMessageIds(current => current.filter(id => id !== messageId))
    } catch { setError(t.error) }
  }

  if (!db || !communityAuth) return <section className="page-content"><div className="panel community-state">{t.error}</div></section>

  return <section className="page-content community-page">
    <div className="section-heading"><div><h2>{t.title}</h2><p>{t.subtitle}</p></div><span className="community-count">{messages.length} {t.count}</span></div>
    <div className="panel community-state"><p>{t.privacy}</p><small>{t.rules}</small></div>
    <div className="panel community-composer">
      <b>{t.choose}</b>
      <div className="community-avatar-picker" role="group" aria-label={t.choose}>
        {localizedCharacters.map((item, index) => <button type="button" key={item.name} className={selected === index ? 'community-avatar-option selected' : 'community-avatar-option'} aria-pressed={selected === index} onClick={() => setSelected(index)}><span>{item.avatar}</span><small>{item.name}</small></button>)}
      </div>
      <form onSubmit={publish}>
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={t.compose} maxLength={500} rows={3} required disabled={!anonUser}/>
        <div className="community-compose-footer"><small>{body.length}/500</small><button className="button-primary" disabled={!ready || !anonUser || busy || !body.trim()}>{!ready ? t.joining : busy ? '…' : t.publish}</button></div>
      </form>
    </div>
    {error && <p className="community-error" role="alert">{error}</p>}
    {loading ? <div className="panel community-state">{t.loading}</div> : messages.length === 0 ? <div className="panel community-state">{t.empty}</div> :
      <div className="community-feed">{messages.map(message => <article className="panel community-post" key={message.id}>
        <div className="community-author"><span className="avatar" aria-hidden="true">{message.avatar || '🎭'}</span><div><b>{message.character || 'شخصية مجهولة'}</b><small>{message.createdAt?.toDate ? message.createdAt.toDate().toLocaleString(lang) : ''}</small></div></div>
        <p className="community-post-body">{message.body}</p><div className="community-post-actions"><button type="button" onClick={() => void reportMessage(message.id)} disabled={!anonUser || reportedIds.includes(message.id) || reporting === message.id}>{reportedIds.includes(message.id) ? t.reported : reporting === message.id ? t.reporting : t.report}</button>{myMessageIds.includes(message.id) && <button type="button" onClick={() => void deleteOwnMessage(message.id)}>{t.delete}</button>}</div>
      </article>)}</div>}
  </section>
}
