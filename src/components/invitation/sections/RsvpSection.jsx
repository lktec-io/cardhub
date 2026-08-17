import { useState } from 'react';
import { FiCheckCircle } from 'react-icons/fi';
import { rsvpService } from '../../../services/rsvpService';

const PARTY_SIZE_OPTIONS = [1, 2, 3, 4, 5, 6];

/**
 * The only place a guest can RSVP without a CardHub account. Interactive
 * (actually submits) only when a real `slug` is passed — the public page
 * is the one caller that provides it. The builder canvas / preview
 * overlay render the same markup with disabled inputs, so the customer
 * sees exactly what guests will see without being able to create test
 * RSVP records against their own event by accident.
 */
export function RsvpSection({ slug, index = 0 }) {
  const interactive = Boolean(slug);
  const [form, setForm] = useState({ name: '', phone: '', email: '', partySize: 1 });
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | submitting | success

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function respond(rsvpStatus) {
    if (!interactive || status === 'submitting') return;
    if (!form.name.trim()) {
      setError('Please tell us your name');
      return;
    }
    setError(null);
    setStatus('submitting');
    try {
      await rsvpService.submit(slug, { ...form, status: rsvpStatus });
      setStatus('success');
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      setStatus('idle');
    }
  }

  if (status === 'success') {
    return (
      <section className="ch-inv-section ch-inv-rsvp ch-animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
        <FiCheckCircle className="ch-inv-rsvp__success-icon" aria-hidden="true" />
        <p className="ch-inv-rsvp__success-text">Thank you — your response has been received.</p>
      </section>
    );
  }

  return (
    <section className="ch-inv-section ch-inv-rsvp ch-animate-slide-up" style={{ animationDelay: `${index * 80}ms` }}>
      <h3 className="ch-inv-rsvp__title">RSVP</h3>
      <p className="ch-inv-rsvp__intro">Kindly let us know if you&rsquo;ll be joining us.</p>

      <div className="ch-inv-rsvp__form">
        <input
          className="ch-inv-rsvp__input"
          placeholder="Your name"
          value={form.name}
          disabled={!interactive}
          onChange={(e) => updateField('name', e.target.value)}
          aria-label="Your name"
        />
        <input
          className="ch-inv-rsvp__input"
          placeholder="Phone (optional)"
          value={form.phone}
          disabled={!interactive}
          onChange={(e) => updateField('phone', e.target.value)}
          aria-label="Phone number"
        />
        <select
          className="ch-inv-rsvp__input"
          value={form.partySize}
          disabled={!interactive}
          onChange={(e) => updateField('partySize', Number(e.target.value))}
          aria-label="Party size"
        >
          {PARTY_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'guest' : 'guests'}
            </option>
          ))}
        </select>

        {error && <p className="ch-inv-rsvp__error">{error}</p>}

        <div className="ch-inv-rsvp__buttons">
          <button
            type="button"
            className="ch-inv-rsvp__button ch-inv-rsvp__button--primary"
            disabled={!interactive || status === 'submitting'}
            onClick={() => respond('attending')}
          >
            I&rsquo;ll be there
          </button>
          <button
            type="button"
            className="ch-inv-rsvp__button"
            disabled={!interactive || status === 'submitting'}
            onClick={() => respond('declined')}
          >
            Can&rsquo;t make it
          </button>
        </div>

        {!interactive && <p className="ch-inv-rsvp__preview-note">RSVP form preview — try it on the published invitation</p>}
      </div>
    </section>
  );
}
