import { Crown, ArrowRight } from 'lucide-react';
import './ClockInApp.css';

export function PremiumPromoBar({ onNavigate }) {
  const handleUpgrade = () => {
    if (onNavigate) {
      onNavigate('premium-plus');
    }
  };

  return (
    <div 
      className="premium-promo-bar"
      onClick={handleUpgrade}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleUpgrade();
        }
      }}
    >
      <div className="premium-promo-content">
        <div className="premium-promo-left">
          <Crown className="premium-promo-icon" />
          <div className="premium-promo-text">
            <span className="premium-promo-title">Unlock Premium Features</span>
            <span className="premium-promo-subtitle">AI Advisor, Advanced Analytics & More</span>
          </div>
        </div>
        <div className="premium-promo-arrow">
          <ArrowRight size={20} />
        </div>
      </div>
    </div>
  );
}
