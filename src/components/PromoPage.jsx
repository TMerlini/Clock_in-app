import { useState } from 'react';
import { auth } from '../lib/firebase';
import { redeemPromoCode } from '../lib/promoUtils';
import { Tag, Crown, CheckCircle } from 'lucide-react';
import './PromoPage.css';

export function PromoPage({ onNavigate }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleRedeem = async () => {
    const user = auth.currentUser;
    if (!user || !code.trim()) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await redeemPromoCode(user.uid, code);
      const planLabel = result.plan.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      const duration = result.durationDays === 0 ? 'permanently' : `for ${result.durationDays} days`;
      setSuccess({ planLabel, duration });
      setCode('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="promo-page">
      <div className="promo-page-card">
        <div className="promo-page-icon">
          <Tag size={32} />
        </div>

        <h1 className="promo-page-title">Have a promo code?</h1>
        <p className="promo-page-subtitle">
          Enter your code below to unlock full access to clock-in.pt features.
        </p>

        {success ? (
          <div className="promo-success-block">
            <CheckCircle size={40} className="promo-success-icon" />
            <h2>You're in!</h2>
            <p>
              <strong>{success.planLabel}</strong> plan activated {success.duration}.
            </p>
            <p className="promo-success-hint">Reload the app to see all your new features.</p>
            <button className="promo-cta-button" onClick={() => window.location.reload()}>
              Reload Now
            </button>
          </div>
        ) : (
          <>
            <div className="promo-input-row">
              <input
                type="text"
                className="promo-code-input"
                placeholder="Enter promo code"
                value={code}
                maxLength={32}
                onChange={e => { setCode(e.target.value.toUpperCase()); setError(null); }}
                onKeyDown={e => e.key === 'Enter' && handleRedeem()}
                autoFocus
              />
              <button
                className="promo-redeem-button"
                disabled={loading || !code.trim()}
                onClick={handleRedeem}
              >
                {loading ? '...' : 'Redeem'}
              </button>
            </div>

            {error && <p className="promo-error">{error}</p>}

            <div className="promo-page-features">
              <div className="promo-feature-item">
                <Crown size={16} />
                <span>Full plan features during beta</span>
              </div>
              <div className="promo-feature-item">
                <CheckCircle size={16} />
                <span>No credit card required</span>
              </div>
              <div className="promo-feature-item">
                <Tag size={16} />
                <span>Codes issued directly by Tiago</span>
              </div>
            </div>

            <button
              className="promo-upgrade-link"
              onClick={() => onNavigate && onNavigate('premium-plus')}
            >
              No code? View plans instead →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
