import { useEffect, useState } from 'react'
import { Mail, Plus, Send, ChevronRight, X, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useParentPortalStore } from '../../store/parentPortal'

export default function MessagesPage() {
  const { messages, messagesTotal, children, fetchMessages, fetchChildren, sendMessage, replyToMessage, markMessageRead } = useParentPortalStore()
  const [showCompose, setShowCompose] = useState(false)
  const [selectedMessage, setSelectedMessage] = useState<any>(null)
  const [page, setPage] = useState(1)
  
  // Compose form
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [studentId, setStudentId] = useState<number | null>(null)
  const [category, setCategory] = useState('general')
  const [priority, setPriority] = useState('normal')
  const [sending, setSending] = useState(false)

  // Reply form
  const [replyContent, setReplyContent] = useState('')
  const [replying, setReplying] = useState(false)

  useEffect(() => {
    fetchMessages(false, page)
    fetchChildren()
  }, [fetchMessages, fetchChildren, page])

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error('Veuillez remplir tous les champs')
      return
    }

    setSending(true)
    try {
      await sendMessage(subject, content, studentId || undefined, category, priority)
      toast.success('Message envoyé!')
      setShowCompose(false)
      setSubject('')
      setContent('')
      setStudentId(null)
      fetchMessages(false, page)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'envoi')
    } finally {
      setSending(false)
    }
  }

  const handleReply = async () => {
    if (!replyContent.trim() || !selectedMessage) return

    setReplying(true)
    try {
      await replyToMessage(selectedMessage.id, replyContent)
      toast.success('Réponse envoyée!')
      setReplyContent('')
      fetchMessages(false, page)
    } catch (error: any) {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setReplying(false)
    }
  }

  const handleOpenMessage = async (msg: any) => {
    if (!msg.read) {
      await markMessageRead(msg.id)
    }
    setSelectedMessage(msg)
  }

  const categories = [
    { id: 'general', label: 'Général' },
    { id: 'academic', label: 'Académique' },
    { id: 'financial', label: 'Financier' },
    { id: 'administrative', label: 'Administratif' }
  ]

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--color-text-primary)' }}>Messages</h1>
          <p style={{ color: 'var(--color-text-secondary)', marginTop: 4 }}>
            Communiquez avec l'école
          </p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #059669, #10b981)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          <Plus size={18} />
          Nouveau message
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedMessage ? '1fr 1fr' : '1fr', gap: 24 }}>
        {/* Messages list */}
        <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, overflow: 'hidden' }}>
          {messages.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Mail size={48} style={{ color: 'var(--color-text-secondary)', marginBottom: 16 }} />
              <p style={{ color: 'var(--color-text-secondary)' }}>Aucun message</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                onClick={() => handleOpenMessage(msg)}
                style={{
                  padding: 16,
                  borderBottom: '1px solid var(--color-border-tertiary)',
                  cursor: 'pointer',
                  background: msg.read ? 'transparent' : '#ecfdf5'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {!msg.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#059669' }} />}
                    <span style={{ fontWeight: msg.read ? 500 : 600 }}>{msg.subject}</span>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {new Date(msg.created_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginLeft: msg.read ? 0 : 16 }}>
                  {msg.content.substring(0, 100)}...
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  {msg.sender_type === 'parent' ? (
                    <span style={{ fontSize: 12, padding: '2px 8px', background: '#ecfdf5', color: '#059669', borderRadius: 4 }}>
                      Vous
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, padding: '2px 8px', background: 'var(--color-background-secondary)', borderRadius: 4 }}>
                      {msg.sender_name || 'Administration'}
                    </span>
                  )}
                  {msg.student_id && (
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                      Concernant: {children.find(c => c.id === msg.student_id)?.full_name}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message detail */}
        {selectedMessage && (
          <div style={{ background: 'var(--color-background-primary)', borderRadius: 12, padding: 20, height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>{selectedMessage.subject}</h3>
              <button onClick={() => setSelectedMessage(null)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: selectedMessage.sender_type === 'parent' ? '#059669' : '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={16} style={{ color: 'white' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 500 }}>{selectedMessage.sender_name || 'Vous'}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                    {new Date(selectedMessage.created_at).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>{selectedMessage.content}</div>
            </div>

            {/* Reply section */}
            <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--color-border-tertiary)' }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>Répondre</div>
              <textarea
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                placeholder="Écrivez votre réponse..."
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  minHeight: 100,
                  fontSize: 14,
                  resize: 'vertical'
                }}
              />
              <button
                onClick={handleReply}
                disabled={replying || !replyContent.trim()}
                style={{
                  marginTop: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: replying ? 'wait' : 'pointer',
                  fontWeight: 500,
                  opacity: replyContent.trim() ? 1 : 0.5
                }}
              >
                <Send size={16} />
                {replying ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compose modal */}
      {showCompose && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--color-background-primary)',
            borderRadius: 16,
            padding: 24,
            width: 500,
            maxWidth: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600 }}>Nouveau message</h3>
              <button onClick={() => setShowCompose(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Sujet</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet du message"
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  fontSize: 14
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid var(--color-border-primary)',
                    fontSize: 14
                  }}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Concernant</label>
                <select
                  value={studentId || ''}
                  onChange={(e) => setStudentId(e.target.value ? parseInt(e.target.value) : null)}
                  style={{
                    width: '100%',
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid var(--color-border-primary)',
                    fontSize: 14
                  }}
                >
                  <option value="">Tous les enfants</option>
                  {children.map((c) => (
                    <option key={c.id} value={c.id}>{c.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>Message</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Votre message..."
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  minHeight: 150,
                  fontSize: 14,
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => setShowCompose(false)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: '1px solid var(--color-border-primary)',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 8,
                  border: 'none',
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: 'white',
                  cursor: sending ? 'wait' : 'pointer',
                  fontWeight: 500
                }}
              >
                {sending ? 'Envoi...' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
