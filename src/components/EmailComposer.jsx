import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { Mail, Send, Loader, Eye, EyeOff, Bold, Italic, Link, Image, Settings, Clock, X, CheckCircle, AlertCircle, Calendar, Youtube } from 'lucide-react';

const BASE_TEMPLATE = (title, body, ctaLabel, ctaUrl = 'https://www.clock-in.pt', footer) => `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#e5e5e5;border-radius:12px;overflow:hidden">
  <div style="background:#6366f1;padding:28px 24px 24px;text-align:center">
    <img src="https://pushers.club/pwa/icon/ydSRia5ZLZ5UCTcrIx-9u/192.png" alt="Clock In" width="64" height="64" style="display:block;margin:0 auto 14px;border-radius:50%" />
    <h1 style="color:#fff;margin:0;font-size:22px">${title}</h1>
  </div>
  <div style="padding:32px 24px">
    ${body}
    <div style="text-align:center;margin:24px 0 8px">
      <a href="${ctaUrl}" style="display:inline-block;background:#6366f1;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">${ctaLabel} →</a>
    </div>
    <p style="margin:24px 0 0;font-size:12px;color:#666;text-align:center">${footer}</p>
  </div>
</div>`;

const TEMPLATES = {
  en: [
    {
      label: 'Welcome / Beta',
      subject: 'Welcome to Clock In Beta! 🎉',
      html: BASE_TEMPLATE(
        'Welcome to Clock In Beta!',
        `<p style="margin:0 0 16px">Hi there 👋</p>
    <p style="margin:0 0 16px">Thanks for joining the Clock In beta. We're excited to have you on board!</p>
    <p style="margin:0 0 16px">Clock In helps you track work hours, manage overtime, and stay compliant with Portuguese labour law — all in one place.</p>
    <p style="margin:0">Give it a try and let us know what you think.</p>`,
        'Start Tracking', 'https://www.clock-in.pt',
        "You're receiving this because you signed up at clock-in.pt"
      ),
    },
    {
      label: 'New Feature',
      subject: 'New in Clock In: [Feature Name] ✨',
      html: BASE_TEMPLATE(
        'Something new just landed ✨',
        `<p style="margin:0 0 16px">Hi there 👋</p>
    <p style="margin:0 0 16px">We just shipped a new feature: <strong style="color:#a5b4fc">[Feature Name]</strong>.</p>
    <p style="margin:0 0 16px">[Short description of what it does and why it's useful.]</p>
    <p style="margin:0">Head over to Clock In to check it out.</p>`,
        "See What's New", 'https://www.clock-in.pt',
        "You're receiving this because you signed up at clock-in.pt"
      ),
    },
    {
      label: 'Promo / Offer',
      subject: 'Exclusive offer for Clock In users 🎁',
      html: BASE_TEMPLATE(
        'A special offer just for you 🎁',
        `<p style="margin:0 0 16px">Hi there 👋</p>
    <p style="margin:0 0 16px">As a valued Clock In user, we'd like to offer you <strong style="color:#a5b4fc">[offer details]</strong>.</p>
    <p style="margin:0 0 16px">Use promo code <span style="background:#1e1e2e;padding:4px 10px;border-radius:6px;font-family:monospace;letter-spacing:0.1em;color:#a5b4fc">[CODE]</span> at checkout.</p>
    <p style="margin:0">Valid until [date].</p>`,
        'Claim Offer', 'https://www.clock-in.pt',
        "You're receiving this because you signed up at clock-in.pt"
      ),
    },
    {
      label: 'Announcement',
      subject: 'Important update from Clock In',
      html: BASE_TEMPLATE(
        'An important update',
        `<p style="margin:0 0 16px">Hi there 👋</p>
    <p style="margin:0 0 16px">[Your announcement here.]</p>
    <p style="margin:0">Thank you for being part of Clock In.</p>`,
        'Learn More', 'https://www.clock-in.pt',
        "You're receiving this because you signed up at clock-in.pt"
      ),
    },
  ],
  pt: [
    {
      label: 'Boas-vindas / Beta',
      subject: 'Bem-vindo ao Clock In Beta! 🎉',
      html: BASE_TEMPLATE(
        'Bem-vindo ao Clock In Beta!',
        `<p style="margin:0 0 16px">Olá 👋</p>
    <p style="margin:0 0 16px">Obrigado por te juntares à beta do Clock In. Estamos muito contentes por te ter cá!</p>
    <p style="margin:0 0 16px">O Clock In ajuda-te a registar horas de trabalho, gerir horas extra e cumprir a legislação laboral portuguesa — tudo num só lugar.</p>
    <p style="margin:0">Experimenta e diz-nos o que achas.</p>`,
        'Começar a Registar', 'https://www.clock-in.pt',
        'Estás a receber este email porque te registaste em clock-in.pt'
      ),
    },
    {
      label: 'Nova Funcionalidade',
      subject: 'Novidade no Clock In: [Nome da Funcionalidade] ✨',
      html: BASE_TEMPLATE(
        'Chegou algo novo ✨',
        `<p style="margin:0 0 16px">Olá 👋</p>
    <p style="margin:0 0 16px">Acabámos de lançar uma nova funcionalidade: <strong style="color:#a5b4fc">[Nome da Funcionalidade]</strong>.</p>
    <p style="margin:0 0 16px">[Descrição breve do que faz e por que é útil.]</p>
    <p style="margin:0">Vai ao Clock In e experimenta.</p>`,
        'Ver Novidades', 'https://www.clock-in.pt',
        'Estás a receber este email porque te registaste em clock-in.pt'
      ),
    },
    {
      label: 'Promoção / Oferta',
      subject: 'Oferta exclusiva para utilizadores Clock In 🎁',
      html: BASE_TEMPLATE(
        'Uma oferta especial para ti 🎁',
        `<p style="margin:0 0 16px">Olá 👋</p>
    <p style="margin:0 0 16px">Como utilizador do Clock In, gostaríamos de te oferecer <strong style="color:#a5b4fc">[detalhes da oferta]</strong>.</p>
    <p style="margin:0 0 16px">Usa o código promocional <span style="background:#1e1e2e;padding:4px 10px;border-radius:6px;font-family:monospace;letter-spacing:0.1em;color:#a5b4fc">[CÓDIGO]</span> no checkout.</p>
    <p style="margin:0">Válido até [data].</p>`,
        'Usar Oferta', 'https://www.clock-in.pt',
        'Estás a receber este email porque te registaste em clock-in.pt'
      ),
    },
    {
      label: 'Anúncio',
      subject: 'Atualização importante do Clock In',
      html: BASE_TEMPLATE(
        'Uma atualização importante',
        `<p style="margin:0 0 16px">Olá 👋</p>
    <p style="margin:0 0 16px">[O teu anúncio aqui.]</p>
    <p style="margin:0">Obrigado por fazeres parte do Clock In.</p>`,
        'Saber Mais', 'https://www.clock-in.pt',
        'Estás a receber este email porque te registaste em clock-in.pt'
      ),
    },
  ],
};

function insertAtCursor(textarea, before, after = '') {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.substring(start, end);
  const newVal = textarea.value.substring(0, start) + before + selected + after + textarea.value.substring(end);
  return { value: newVal, cursor: start + before.length + selected.length + after.length };
}

function StatusBadge({ status }) {
  const map = {
    scheduled: { color: '#facc15', bg: 'rgba(250,204,21,0.12)', icon: <Clock size={11} /> },
    sent:      { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', icon: <CheckCircle size={11} /> },
    cancelled: { color: '#6b7280', bg: 'rgba(107,114,128,0.12)', icon: <X size={11} /> },
    failed:    { color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: <AlertCircle size={11} /> },
  };
  const s = map[status] || map.failed;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', background: s.bg, color: s.color, border: `1px solid ${s.color}33`, borderRadius: '4px', padding: '2px 7px', fontSize: '0.7rem', fontWeight: 600, textTransform: 'capitalize' }}>
      {s.icon}{status}
    </span>
  );
}

function ScheduledEmailsList() {
  const [items, setItems] = useState([]);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'scheduledEmails'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snap => setItems(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleCancel = async (broadcastId) => {
    if (!confirm('Cancel this scheduled broadcast?')) return;
    setCancelling(broadcastId);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/cancel-email', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ broadcastId }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
    } catch (err) {
      alert('Cancel failed: ' + err.message);
    } finally {
      setCancelling(null);
    }
  };

  if (!items.length) return (
    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '1rem 0 0', fontStyle: 'italic' }}>No broadcasts sent yet.</p>
  );

  const fmtDate = (val) => {
    if (!val) return '—';
    const d = val?.toDate ? val.toDate() : new Date(val);
    return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.6rem', fontWeight: 600 }}>Broadcast History</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxWidth: '820px' }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'var(--bg-secondary, rgba(255,255,255,0.04))', border: '1px solid var(--border)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}>
            <StatusBadge status={item.status} />
            <span style={{ flex: 1, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.subject}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{item.recipients || 'all'}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
              {item.status === 'scheduled' ? <><Calendar size={10} style={{ display: 'inline', marginRight: 3 }} />{fmtDate(item.scheduledAt)}</> : fmtDate(item.createdAt)}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{item.total ?? '—'} rcpt</span>
            {item.status === 'scheduled' && (
              <button onClick={() => handleCancel(item.id)} disabled={cancelling === item.id} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '5px', color: 'var(--text-muted)', padding: '2px 8px', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                {cancelling === item.id ? <Loader size={11} className="spin" /> : <X size={11} />} Cancel
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function WelcomeEmailEditor() {
  const inputStyle = { background: 'var(--bg, #18181b)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', padding: '0.5rem 0.75rem', fontSize: '0.9rem', width: '100%' };
  const [form, setForm] = useState({ subject: '', html: '', fromName: 'Clock In' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    getDoc(doc(db, 'system', 'welcomeEmail')).then(snap => {
      if (snap.exists()) setForm(f => ({ ...f, ...snap.data() }));
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'welcomeEmail'), form, { merge: true });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally { setSaving(false); }
  };

  if (loading) return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading...</p>;

  return (
    <form onSubmit={handleSave} style={{ maxWidth: '820px' }}>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
        Sent automatically when a new user signs in for the first time. Use <code style={{ background: 'var(--bg-secondary, rgba(255,255,255,0.06))', padding: '1px 5px', borderRadius: '4px' }}>{'{{name}}'}</code> to personalise.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
        <div className="form-group">
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Subject *</label>
          <input style={inputStyle} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Welcome to Clock In! 🎉" required />
        </div>
        <div className="form-group">
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>From Name</label>
          <input style={inputStyle} value={form.fromName} onChange={e => setForm(f => ({ ...f, fromName: e.target.value }))} placeholder="Clock In" />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.4rem' }}>
        <button type="button" style={{ background: 'none', border: '1px solid var(--border)', borderRadius: '6px', color: showPreview ? 'var(--accent)' : 'var(--text-muted)', padding: '4px 12px', cursor: 'pointer', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }} onClick={() => setShowPreview(v => !v)}>
          {showPreview ? <EyeOff size={13} /> : <Eye size={13} />} {showPreview ? 'Hide Preview' : 'Preview'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>HTML Body *</label>
          <textarea style={{ ...inputStyle, minHeight: '280px', fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical' }} value={form.html} onChange={e => setForm(f => ({ ...f, html: e.target.value }))} placeholder="<p>Hi {{name}} 👋</p>" required />
        </div>
        {showPreview && (
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Preview</label>
            <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'auto', minHeight: '280px', background: '#fff' }}>
              <iframe srcDoc={form.html} style={{ width: '100%', minHeight: '280px', border: 'none', display: 'block' }} title="Welcome Email Preview" sandbox="allow-same-origin" />
            </div>
          </div>
        )}
      </div>

      {saved && <p style={{ color: 'var(--success, #4ade80)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>✓ Saved — new signups will receive this email</p>}
      <button type="submit" className="submit-button" disabled={saving}>
        {saving ? <Loader size={14} className="spin" /> : <Settings size={14} />}
        {saving ? 'Saving...' : 'Save Welcome Email'}
      </button>
    </form>
  );
}

export function EmailComposer({ emailForm, setEmailForm, emailSending, emailResult, emailError, onSubmit }) {
  const [activeTab, setActiveTab] = useState('newsletter');
  const [lang, setLang] = useState('en');
  const [showPreview, setShowPreview] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [textColor, setTextColor] = useState('#a5b4fc');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [showVideoInput, setShowVideoInput] = useState(false);

  const applyFormat = (before, after = '') => {
    const ta = document.getElementById('email-body-textarea');
    if (!ta) return;
    const { value, cursor } = insertAtCursor(ta, before, after);
    setEmailForm(f => ({ ...f, html: value }));
    setTimeout(() => { ta.focus(); ta.setSelectionRange(cursor, cursor); }, 0);
  };

  const insertImage = () => {
    if (!imageUrl.trim()) return;
    applyFormat(`<img src="${imageUrl.trim()}" alt="" style="max-width:100%;border-radius:8px;margin:12px 0" />`);
    setImageUrl('');
    setShowImageInput(false);
  };

  const insertVideo = () => {
    const url = videoUrl.trim();
    if (!url) return;
    const ytMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (!ytMatch) { alert('Please enter a valid YouTube URL'); return; }
    const videoId = ytMatch[1];
    const thumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    applyFormat(`<a href="${watchUrl}" style="display:block;position:relative;margin:16px 0;border-radius:8px;overflow:hidden;text-decoration:none"><img src="${thumb}" alt="Watch video" style="width:100%;display:block;border-radius:8px" /><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.7);border-radius:50%;width:56px;height:56px;display:flex;align-items:center;justify-content:center"><div style="width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:20px solid #fff;margin-left:4px"></div></div></a>`);
    setVideoUrl('');
    setShowVideoInput(false);
  };

  const insertLink = () => {
    if (!linkUrl.trim()) return;
    applyFormat(`<a href="${linkUrl.trim()}" style="color:#a5b4fc;text-decoration:underline">${linkText || linkUrl.trim()}</a>`);
    setLinkUrl('');
    setLinkText('');
    setShowLinkInput(false);
  };

  const inputStyle = { background: 'var(--bg, #18181b)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', padding: '0.5rem 0.75rem', fontSize: '0.9rem', width: '100%' };
  const toolbarBtnStyle = { background: 'var(--bg-secondary, rgba(255,255,255,0.06))', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-muted)', padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' };

  return (
    <div className="admin-section">
      <div className="section-header">
        <Mail size={20} />
        <h2>Email / Newsletter</h2>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '2px', background: 'var(--bg-secondary, rgba(255,255,255,0.06))', borderRadius: '6px', padding: '2px', border: '1px solid var(--border)' }}>
          {[['newsletter', 'Newsletter'], ['welcome', 'Welcome Email']].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} style={{ padding: '4px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, background: activeTab === id ? 'var(--accent)' : 'transparent', color: activeTab === id ? '#fff' : 'var(--text-muted)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'welcome' && <WelcomeEmailEditor />}
      {activeTab === 'newsletter' && <>

      {/* Template picker + language toggle */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Start from a template:</p>
          <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-secondary, rgba(255,255,255,0.06))', borderRadius: '6px', padding: '2px', border: '1px solid var(--border)' }}>
            {['en', 'pt'].map(l => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                style={{ padding: '3px 12px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                  background: lang === l ? 'var(--accent)' : 'transparent',
                  color: lang === l ? '#fff' : 'var(--text-muted)',
                }}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {TEMPLATES[lang].map(t => (
            <button
              key={t.label}
              type="button"
              style={toolbarBtnStyle}
              onClick={() => setEmailForm(f => ({ ...f, subject: t.subject, html: t.html }))}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={onSubmit} style={{ maxWidth: '820px' }}>
        {/* Row 1: recipients + from name */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Recipients</label>
            <select style={inputStyle} value={emailForm.recipients} onChange={e => setEmailForm(f => ({ ...f, recipients: e.target.value }))}>
              <option value="all">All Users</option>
              <option value="plan:free">Free Plan</option>
              <option value="plan:basic">Basic Plan</option>
              <option value="plan:pro">Pro Plan</option>
              <option value="plan:premium_ai">Premium AI Plan</option>
              <option value="plan:enterprise">Enterprise Plan</option>
            </select>
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>From Name</label>
            <input style={inputStyle} placeholder="Clock In" value={emailForm.fromName} onChange={e => setEmailForm(f => ({ ...f, fromName: e.target.value }))} />
          </div>
        </div>

        {/* Subject + preview text */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div className="form-group">
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Subject *</label>
            <input style={inputStyle} placeholder="e.g. Welcome to Clock In Beta!" value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Preview Text <span style={{ opacity: 0.5 }}>(inbox snippet)</span></label>
            <input style={inputStyle} placeholder="Short teaser shown in inbox..." value={emailForm.previewText || ''} onChange={e => setEmailForm(f => ({ ...f, previewText: e.target.value }))} />
          </div>
        </div>

        {/* Formatting toolbar */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.4rem', alignItems: 'center' }}>
          <button type="button" style={toolbarBtnStyle} onClick={() => applyFormat('<strong>', '</strong>')}><Bold size={13} /> Bold</button>
          <button type="button" style={toolbarBtnStyle} onClick={() => applyFormat('<em>', '</em>')}><Italic size={13} /> Italic</button>
          <button type="button" style={{ ...toolbarBtnStyle, position: 'relative' }} onClick={() => applyFormat(`<span style="color:${textColor}">`, '</span>')}>
            <span style={{ width: 12, height: 12, borderRadius: '50%', background: textColor, display: 'inline-block' }} /> Color
            <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer', top: 0, left: 0 }} />
          </button>
          <button type="button" style={toolbarBtnStyle} onClick={() => setShowLinkInput(v => !v)}><Link size={13} /> Link</button>
          <button type="button" style={toolbarBtnStyle} onClick={() => setShowImageInput(v => !v)}><Image size={13} /> Image</button>
          <button type="button" style={toolbarBtnStyle} onClick={() => setShowVideoInput(v => !v)}><Youtube size={13} /> Video</button>
          <button type="button" style={toolbarBtnStyle} onClick={() => applyFormat('<p style="margin:0 0 16px">', '</p>')}>&lt;p&gt;</button>
          <button type="button" style={toolbarBtnStyle} onClick={() => applyFormat('<h2 style="color:#a5b4fc;margin:0 0 12px">', '</h2>')}>&lt;h2&gt;</button>
          <div style={{ marginLeft: 'auto' }}>
            <button type="button" style={{ ...toolbarBtnStyle, color: showPreview ? 'var(--accent)' : 'var(--text-muted)' }} onClick={() => setShowPreview(v => !v)}>
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />} {showPreview ? 'Hide Preview' : 'Preview'}
            </button>
          </div>
        </div>

        {/* Link insert helper */}
        {showLinkInput && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <input style={{ ...inputStyle, flex: 1, minWidth: '180px' }} placeholder="URL (https://...)" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} />
            <input style={{ ...inputStyle, flex: 1, minWidth: '140px' }} placeholder="Link text (optional)" value={linkText} onChange={e => setLinkText(e.target.value)} />
            <button type="button" style={{ ...toolbarBtnStyle, background: 'var(--accent)', color: '#fff' }} onClick={insertLink}>Insert</button>
          </div>
        )}

        {/* Video insert helper */}
        {showVideoInput && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="YouTube URL (https://youtube.com/watch?v=...)" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
            <button type="button" style={{ ...toolbarBtnStyle, background: 'var(--accent)', color: '#fff' }} onClick={insertVideo}>Insert</button>
          </div>
        )}

        {/* Image insert helper */}
        {showImageInput && (
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input style={{ ...inputStyle, flex: 1 }} placeholder="Image URL (https://...)" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
            <button type="button" style={{ ...toolbarBtnStyle, background: 'var(--accent)', color: '#fff' }} onClick={insertImage}>Insert</button>
          </div>
        )}

        {/* Editor + Preview split */}
        <div style={{ display: 'grid', gridTemplateColumns: showPreview ? '1fr 1fr' : '1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>HTML Body *</label>
            <textarea
              id="email-body-textarea"
              style={{ ...inputStyle, minHeight: '260px', fontFamily: 'monospace', fontSize: '0.78rem', resize: 'vertical' }}
              placeholder={'<p>Hello,</p>\n<p>Your message here...</p>'}
              value={emailForm.html}
              onChange={e => setEmailForm(f => ({ ...f, html: e.target.value }))}
              required
            />
          </div>
          {showPreview && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Preview</label>
              <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'auto', minHeight: '260px', background: '#fff' }}>
                <iframe
                  srcDoc={emailForm.html}
                  style={{ width: '100%', minHeight: '260px', border: 'none', display: 'block' }}
                  title="Email Preview"
                  sandbox="allow-same-origin"
                />
              </div>
            </div>
          )}
        </div>

        {/* Schedule toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', padding: '0.6rem 0.75rem', background: 'var(--bg-secondary, rgba(255,255,255,0.04))', border: '1px solid var(--border)', borderRadius: '8px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)', userSelect: 'none' }}>
            <input type="checkbox" checked={scheduleEnabled} onChange={e => { setScheduleEnabled(e.target.checked); if (!e.target.checked) setEmailForm(f => ({ ...f, scheduledAt: null })); }} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
            <Clock size={14} /> Schedule for later
          </label>
          {scheduleEnabled && (
            <input
              type="datetime-local"
              style={{ background: 'var(--bg, #18181b)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text)', padding: '0.35rem 0.6rem', fontSize: '0.85rem', marginLeft: 'auto' }}
              min={new Date(Date.now() + 5 * 60000).toISOString().slice(0, 16)}
              value={emailForm.scheduledAt ? new Date(emailForm.scheduledAt).toISOString().slice(0, 16) : ''}
              onChange={e => setEmailForm(f => ({ ...f, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
              required={scheduleEnabled}
            />
          )}
        </div>

        {emailError && <p style={{ color: 'var(--error, #f87171)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{emailError}</p>}
        {emailResult && (
          <p style={{ color: 'var(--success, #4ade80)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            {emailResult.scheduled
              ? `✓ Scheduled for ${new Date(emailForm.scheduledAt).toLocaleString()} · ${emailResult.total} recipients`
              : `✓ Sent to ${emailResult.sent} / ${emailResult.total} recipients${emailResult.errors?.length > 0 ? ` · ${emailResult.errors.length} failed` : ''}`
            }
          </p>
        )}

        <button type="submit" className="submit-button" disabled={emailSending}>
          {emailSending ? <Loader size={14} className="spin" /> : scheduleEnabled ? <Clock size={14} /> : <Send size={14} />}
          {emailSending ? (scheduleEnabled ? 'Scheduling...' : 'Sending...') : scheduleEnabled ? 'Schedule Email' : 'Send Now'}
        </button>
      </form>

      <ScheduledEmailsList />
      </>}
    </div>
  );
}
