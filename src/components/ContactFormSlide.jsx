import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import './ContactFormSlide.css';

export function ContactFormSlide({ title, description }) {
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
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
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
        <h2 className="contact-slide-title">{title || 'Get in Touch'}</h2>
        {description && <p className="contact-slide-desc">{description}</p>}

        {status === 'success' ? (
          <div className="contact-slide-success">
            <CheckCircle size={40} />
            <p>Message sent! We'll get back to you soon.</p>
          </div>
        ) : (
          <form className="contact-slide-form" onSubmit={handleSubmit}>
            <div className="contact-slide-field">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                required
                disabled={status === 'submitting'}
              />
            </div>
            <div className="contact-slide-field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                disabled={status === 'submitting'}
              />
            </div>
            <div className="contact-slide-field">
              <label>Message</label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleChange}
                placeholder="How can we help?"
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
                <><Loader size={16} className="spinning" /> Sending...</>
              ) : (
                <><Send size={16} /> Send Message</>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
