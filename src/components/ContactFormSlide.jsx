import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './ContactFormSlide.css';

export function ContactFormSlide({ title, description }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('contactForm.errorFallback'));
      setStatus('success');
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setStatus('error');
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="contact-slide">
      <div className="contact-slide-inner">
        <div className="contact-slide-logo">
          <img src="/images/animated white.gif" alt="Clock In" />
        </div>
        <h2 className="contact-slide-title">{title || t('contactForm.title')}</h2>
        {description && <p className="contact-slide-desc">{description}</p>}

        {status === 'success' ? (
          <div className="contact-slide-success">
            <CheckCircle size={40} />
            <p>{t('contactForm.successMessage')}</p>
          </div>
        ) : (
          <form className="contact-slide-form" onSubmit={handleSubmit}>
            <div className="contact-slide-field">
              <label>{t('contactForm.nameLabel')}</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder={t('contactForm.namePlaceholder')}
                required
                disabled={status === 'submitting'}
              />
            </div>
            <div className="contact-slide-field">
              <label>{t('contactForm.emailLabel')}</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder={t('contactForm.emailPlaceholder')}
                required
                disabled={status === 'submitting'}
              />
            </div>
            <div className="contact-slide-field">
              <label>{t('contactForm.messageLabel')}</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder={t('contactForm.messagePlaceholder')}
                rows={4}
                required
                disabled={status === 'submitting'}
              />
            </div>

            {status === 'error' && (
              <div className="contact-slide-error">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              className="contact-slide-submit"
              disabled={status === 'submitting'}
            >
              {status === 'submitting' ? (
                <><Loader size={16} className="spinning" /> {t('contactForm.sending')}</>
              ) : (
                <><Send size={16} /> {t('contactForm.send')}</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
