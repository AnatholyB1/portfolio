'use client';
import { useState, FormEvent } from 'react';
import { useLanguage } from '@/context/LanguageContext';

const FORM_URL = process.env.NEXT_PUBLIC_FORM_URL || 'https://example.com/api/contact';

if (!process.env.NEXT_PUBLIC_FORM_URL && typeof window !== 'undefined') {
  console.warn('[ContactSection] NEXT_PUBLIC_FORM_URL is not set — using fallback URL');
}

export default function ContactSection() {
  const { t } = useLanguage();
  const c = t.landing.contact;
  const f = c.form;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    projectType: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    const fullMessage = formData.projectType
      ? `[${formData.projectType}]\n\n${formData.message}`
      : formData.message;
    try {
      const response = await fetch(FORM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          message: fullMessage,
        }),
      });
      setStatus(response.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <section className="sec border-t contact" id="contact">
      <div className="wrap">
        <div className="contact-grid">
          {/* Left: info block */}
          <div>
            <div className="num" style={{ marginBottom: 16 }}>{c.num}</div>
            <h2 className="contact-title">
              {c.title_l1}<br /><em className="it">{c.title_l2_it}</em>
            </h2>
            <p className="sec-intro" data-reveal>{c.sub}</p>
            <div className="contact-info" data-reveal data-reveal-delay="1">
              {c.info.map((row, i) => (
                <div className="row" key={i}>
                  <span className="k">{row.k}</span>
                  <span className="v">{row.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: form */}
          <form className="form" onSubmit={handleSubmit} data-reveal data-reveal-delay="2">
            <div className="field">
              <label>{f.name_l}</label>
              <input
                type="text"
                placeholder={f.name_p}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>{f.email_l}</label>
              <input
                type="email"
                placeholder={f.email_p}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>{f.type_l}</label>
              <select
                value={formData.projectType}
                onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                required
              >
                <option value="">—</option>
                {f.type_o.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>{f.msg_l}</label>
              <textarea
                placeholder={f.msg_p}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                required
              />
            </div>
            <div className="form-foot">
              <span className={`ok ${status === 'sent' ? 'success' : ''}`}>
                {status === 'sent' ? f.success : f.note}
              </span>
              <button type="submit" className="submit" disabled={status !== 'idle'}>
                {status === 'sending' ? f.submitting : status === 'sent' ? '✓' : f.submit}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
