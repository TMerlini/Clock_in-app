import { Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './PlanGate.css';

export function PlanGate({ requiredPlan, featureName, onUpgrade }) {
  const { t } = useTranslation();
  const planKey = requiredPlan === 'basic' ? 'basic' : 'premium';
  const title = t(`planGate.${planKey}.title`);
  const description = t(`planGate.${planKey}.description`, { feature: featureName });
  const buttonLabel = t(`planGate.${planKey}.button`);

  return (
    <div className="plan-gate-container">
      <div className="plan-gate">
        <div className="plan-gate-icon">
          <Crown />
        </div>
        <h2>{title}</h2>
        <p>{description}</p>
        <button className="plan-gate-upgrade-button" onClick={onUpgrade}>
          <Crown size={18} />
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
