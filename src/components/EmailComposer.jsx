import { useState } from 'react';
import { Mail, Send, Loader, Eye, EyeOff, Bold, Italic, Link, Image } from 'lucide-react';

const BASE_TEMPLATE = (title, body, ctaLabel, ctaUrl = 'https://www.clock-in.pt', footer) => `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#e5e5e5;border-radius:12px;overflow:hidden">
  <div style="background:#6366f1;padding:32px 24px;text-align:center">
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

export function EmailComposer({ emailForm, setEmailForm, emailSending, emailResult, emailError, onSubmit }) {
  const [lang, setLang] = useState('en');
  const [showPreview, setShowPreview] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [showImageInput, setShowImageInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [textColor, setTextColor] = useState('#a5b4fc');

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
      </div>

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

        {emailError && <p style={{ color: 'var(--error, #f87171)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{emailError}</p>}
        {emailResult && (
          <p style={{ color: 'var(--success, #4ade80)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
            ✓ Sent to {emailResult.sent} / {emailResult.total} recipients
            {emailResult.errors?.length > 0 && ` · ${emailResult.errors.length} failed`}
          </p>
        )}

        <button type="submit" className="submit-button" disabled={emailSending}>
          {emailSending ? <Loader size={14} className="spin" /> : <Send size={14} />}
          {emailSending ? 'Sending...' : 'Send Email'}
        </button>
      </form>
    </div>
  );
}
