import { useEffect, useState, type FormEvent } from 'react'
import type { User } from 'firebase/auth'
import {
  addDoc, collection, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Lang } from './i18n'

type Post = {
  id: string
  authorUid: string
  authorName: string
  body: string
  createdAt?: { toDate?: () => Date } | null
}
type Comment = { id: string; authorUid: string; authorName: string; body: string }

const copy = {
  ar: {
    title: 'CryptoCommunity', subtitle: 'مجتمع العملات الرقمية: شارك أفكارك وتعلّم من الآخرين.',
    compose: 'ماذا يدور في بالك حول الكريبتو؟', publish: 'نشر المنشور', loading: 'جارٍ تحميل المنشورات…',
    empty: 'لا توجد منشورات بعد. كن أول من يبدأ النقاش!', signIn: 'سجّل الدخول للمشاركة في المجتمع.',
    verify: 'أكد بريدك الإلكتروني حتى تتمكن من النشر والتعليق. أرسلنا رسالة تحقق إلى بريدك.',
    resend: 'إعادة إرسال رسالة التحقق', sent: 'تم إرسال رسالة تحقق جديدة إلى بريدك.',
    error: 'تعذر تنفيذ العملية. تحقق من إعداد Firebase وقواعد Firestore ثم حاول مجدداً.',
    comments: 'التعليقات', addComment: 'اكتب تعليقاً…', send: 'إرسال', member: 'عضو',
    count: 'منشور', setup: 'يلزم تهيئة Firebase وتفعيل Cloud Firestore لإطلاق المجتمع.',
  },
  fr: {
    title: 'CryptoCommunity', subtitle: 'La communauté crypto : partagez vos idées et apprenez ensemble.',
    compose: 'Que pensez-vous de la crypto ?', publish: 'Publier', loading: 'Chargement des publications…',
    empty: 'Aucune publication. Lancez la première discussion !', signIn: 'Connectez-vous pour participer.',
    verify: 'Confirmez votre adresse e-mail pour publier et commenter. Un e-mail de vérification a été envoyé.',
    resend: 'Renvoyer l’e-mail de vérification', sent: 'Un nouvel e-mail de vérification a été envoyé.',
    error: 'Action impossible. Vérifiez Firebase et les règles Firestore.',
    comments: 'Commentaires', addComment: 'Écrire un commentaire…', send: 'Envoyer', member: 'Membre',
    count: 'publication', setup: 'Configurez Firebase et activez Cloud Firestore pour lancer la communauté.',
  },
  en: {
    title: 'CryptoCommunity', subtitle: 'A crypto-native community to share ideas and learn together.',
    compose: 'What is on your mind about crypto?', publish: 'Publish post', loading: 'Loading posts…',
    empty: 'No posts yet. Start the first conversation!', signIn: 'Sign in to participate in the community.',
    verify: 'Verify your email address before posting or commenting. We sent you a verification email.',
    resend: 'Resend verification email', sent: 'A new verification email has been sent.',
    error: 'Could not complete the action. Check Firebase and your Firestore security rules.',
    comments: 'Comments', addComment: 'Write a comment…', send: 'Send', member: 'Member',
    count: 'posts', setup: 'Configure Firebase and enable Cloud Firestore to launch the community.',
  },
} as const

export default function Community({ user, lang, onResendVerification, onRefreshUser }: {
  user: User | null
  lang: Lang
  onResendVerification: () => Promise<void>
  onRefreshUser: () => Promise<void>
}) {
  const t = copy[lang]
  const verified = Boolean(user?.emailVerified)
  const [posts, setPosts] = useState<Post[]>([])
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [expanded, setExpanded] = useState<string[]>([])
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!db) { setLoading(false); return }
    const feed = query(collection(db, 'communityPosts'), orderBy('createdAt', 'desc'), limit(40))
    return onSnapshot(feed, snapshot => {
      setPosts(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as Post)))
      setLoading(false)
      setError('')
    }, () => { setLoading(false); setError(t.error) })
  }, [t.error])

  useEffect(() => {
    if (!user || verified) return
    const refresh = () => { if (document.visibilityState === 'visible') void onRefreshUser() }
    document.addEventListener('visibilitychange', refresh)
    return () => document.removeEventListener('visibilitychange', refresh)
  }, [user, verified, onRefreshUser])

  const displayName = user?.displayName?.trim() || `${t.member} ${user?.uid.slice(0, 5) ?? ''}`

  const publish = async (event: FormEvent) => {
    event.preventDefault()
    const text = body.trim()
    if (!db || !user || !verified || !text || text.length > 1000 || busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      await addDoc(collection(db, 'communityPosts'), {
        authorUid: user.uid, authorName: displayName, body: text, createdAt: serverTimestamp(),
      })
      setBody('')
    } catch { setError(t.error) } finally { setBusy(false) }
  }

  const loadComments = async (postId: string) => {
    if (!db) return
    const isOpen = expanded.includes(postId)
    setExpanded(old => isOpen ? old.filter(id => id !== postId) : [...old, postId])
    if (isOpen || comments[postId]) return
    try {
      const rows = await getDocs(query(collection(db, 'communityPosts', postId, 'comments'), orderBy('createdAt', 'asc'), limit(30)))
      setComments(old => ({ ...old, [postId]: rows.docs.map(item => ({ id: item.id, ...item.data() } as Comment)) }))
    } catch { setError(t.error) }
  }

  const addComment = async (event: FormEvent, postId: string) => {
    event.preventDefault()
    const text = (commentDrafts[postId] || '').trim()
    if (!db || !user || !verified || !text || text.length > 500 || busy) return
    setBusy(true); setError('')
    try {
      const row = await addDoc(collection(db, 'communityPosts', postId, 'comments'), {
        authorUid: user.uid, authorName: displayName, body: text, createdAt: serverTimestamp(),
      })
      setComments(old => ({ ...old, [postId]: [...(old[postId] || []), { id: row.id, authorUid: user.uid, authorName: displayName, body: text }] }))
      setCommentDrafts(old => ({ ...old, [postId]: '' }))
    } catch { setError(t.error) } finally { setBusy(false) }
  }

  if (!db) return <section className="page-content"><div className="panel community-state">{t.setup}</div></section>

  return <section className="page-content community-page">
    <div className="section-heading"><div><h2>{t.title}</h2><p>{t.subtitle}</p></div><span className="community-count">{posts.length} {t.count}</span></div>
    {user && !verified && <div className="panel community-verify" role="status">
      <p>{t.verify}</p>
      <button className="button-ghost" onClick={async () => { setError(''); try { await onResendVerification(); setNotice(t.sent) } catch { setError(t.error) } }}>{t.resend}</button>
    </div>}
    {!user && <div className="panel community-state">{t.signIn}</div>}
    {user && verified && <form className="panel community-composer" onSubmit={publish}>
      <div className="community-author"><span className="avatar">{displayName.slice(0, 1).toUpperCase()}</span><b>{displayName}</b></div>
      <textarea value={body} onChange={e => setBody(e.target.value)} placeholder={t.compose} maxLength={1000} rows={4} required/>
      <div className="community-compose-footer"><small>{body.length}/1000</small><button className="button-primary" disabled={busy || !body.trim()}>{busy ? '…' : t.publish}</button></div>
    </form>}
    {notice && <p className="community-notice" role="status">{notice}</p>}
    {error && <p className="community-error" role="alert">{error}</p>}
    {loading ? <div className="panel community-state">{t.loading}</div> : posts.length === 0 ? <div className="panel community-state">{t.empty}</div> :
      <div className="community-feed">{posts.map(post => <article className="panel community-post" key={post.id}>
        <div className="community-author"><span className="avatar">{(post.authorName || t.member).slice(0, 1).toUpperCase()}</span><div><b>{post.authorName || t.member}</b><small>{post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString(lang) : ''}</small></div></div>
        <p className="community-post-body">{post.body}</p>
        <button className="community-comment-toggle" onClick={() => void loadComments(post.id)}>{t.comments}</button>
        {expanded.includes(post.id) && <div className="community-comments">
          {(comments[post.id] || []).map(comment => <div className="community-comment" key={comment.id}><b>{comment.authorName}</b><p>{comment.body}</p></div>)}
          {verified && <form className="community-comment-form" onSubmit={event => void addComment(event, post.id)}>
            <input value={commentDrafts[post.id] || ''} onChange={e => setCommentDrafts(old => ({ ...old, [post.id]: e.target.value }))} placeholder={t.addComment} maxLength={500}/>
            <button className="button-ghost" disabled={busy || !(commentDrafts[post.id] || '').trim()}>{t.send}</button>
          </form>}
        </div>}
      </article>)}</div>}
  </section>
}
