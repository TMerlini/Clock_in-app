import { useState, useEffect } from 'react';
import { Crown, Check, Sparkles, Zap, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getPlanConfig } from '../lib/planConfig';
import './PremiumPlus.css';
import './PlansSlide.css';

export function PlansSlide({ title, description }) {
  const { t } = useTranslation();
  const [planConfig, setPlanConfig] = useState(null);

  useEffect(() => {
    getPlanConfig().then(setPlanConfig).catch(() => setPlanConfig(null));
  }, []);

  const cfg = (id) => planConfig?.plans?.[id] ?? null;

  const resolveFeatures = (planId, fallbackKeys, extra) => {
    const overrides = cfg(planId)?.features;
    if (Array.isArray(overrides) && overrides.length > 0) return overrides;
    return fallbackKeys.map((k) => {
      if (typeof k === 'object' && k && k.key) return t(k.key, k);
      return t(k);
    });
  };

  const plans = [
    {
      id: 'BASIC',
      name: t('premiumPlus.plans.basic.name'),
      price: cfg('basic')?.price ?? '€0.99',
      period: cfg('basic')?.period ?? t('premiumPlus.plans.basic.period', { defaultValue: 'month' }),
      icon: Zap,
      features: resolveFeatures('basic', [
        'premiumPlus.plans.basic.feature1',
        'premiumPlus.plans.basic.feature2',
        'premiumPlus.plans.basic.feature3',
        'premiumPlus.plans.basic.feature4',
        'premiumPlus.plans.basic.feature5',
      ]),
      color: 'blue',
    },
    {
      id: 'PRO',
      name: t('premiumPlus.plans.pro.name'),
      price: cfg('pro')?.price ?? '€4.99',
      period: cfg('pro')?.period ?? t('premiumPlus.plans.pro.period', { defaultValue: 'month' }),
      icon: Sparkles,
      features: resolveFeatures('pro', [
        'premiumPlus.plans.pro.feature1',
        'premiumPlus.plans.pro.feature2',
        'premiumPlus.plans.pro.feature3',
        'premiumPlus.plans.pro.feature4',
        'premiumPlus.plans.pro.feature5',
        'premiumPlus.plans.pro.feature6',
      ]),
      color: 'purple',
      popular: true,
    },
    {
      id: 'PREMIUM_AI',
      name: t('premiumPlus.plans.premiumAi.name'),
      price: cfg('premium_ai')?.price ?? '€9.99',
      period: cfg('premium_ai')?.period ?? t('premiumPlus.plans.premiumAi.period', { defaultValue: 'month' }),
      icon: Crown,
      features: resolveFeatures('premium_ai', [
        'premiumPlus.plans.premiumAi.feature1',
        'premiumPlus.plans.premiumAi.feature2',
        'premiumPlus.plans.premiumAi.feature3',
        'premiumPlus.plans.premiumAi.feature4',
        'premiumPlus.plans.premiumAi.feature5',
        'premiumPlus.plans.premiumAi.feature6',
        'premiumPlus.plans.premiumAi.feature7',
      ]),
      color: 'gold',
    },
    {
      id: 'ENTERPRISE',
      name: t('premiumPlus.plans.enterprise.name'),
      price: cfg('enterprise')?.price ?? t('premiumPlus.plans.enterprise.price'),
      period: cfg('enterprise')?.period ?? t('premiumPlus.plans.enterprise.period', { defaultValue: 'month' }),
      icon: Building2,
      features: (() => {
        const maxCount = cfg('enterprise')?.maxPremiumUsers ?? 10;
        return resolveFeatures('enterprise', [
          'premiumPlus.plans.enterprise.feature1',
          'premiumPlus.plans.enterprise.feature2',
          { key: 'premiumPlus.plans.enterprise.feature3', count: maxCount },
          'premiumPlus.plans.enterprise.feature4',
          'premiumPlus.plans.enterprise.feature5',
          'premiumPlus.plans.enterprise.feature6',
          'premiumPlus.plans.enterprise.feature7',
        ], maxCount);
      })(),
      color: 'indigo',
    },
  ];

  return (
    <div className="plans-slide">
      <div className="plans-slide-inner">
        {(title || description) && (
          <div className="plans-slide-header">
            {title && <h2 className="plans-slide-title">{title}</h2>}
            {description && <p className="plans-slide-desc">{description}</p>}
          </div>
        )}
        <div className="plans-grid plans-grid--slide">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            return (
              <div
                key={plan.id}
                className={`plan-card${plan.popular ? ' popular' : ''}`}
              >
                {plan.popular && (
                  <div className="popular-badge">{t('premiumPlus.plans.mostPopular')}</div>
                )}
                <div className="plan-header">
                  <div className={`plan-icon ${plan.color}`}>
                    <IconComponent size={32} />
                  </div>
                  <h2 className="plan-name">{plan.name}</h2>
                  <div className="plan-price">
                    <span className="price-amount">{plan.price}</span>
                    <span className="price-period">/{plan.period}</span>
                  </div>
                </div>

                <ul className="plan-features">
                  {plan.features.map((feature, index) => (
                    <li key={index}>
                      <Check size={18} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {['PRO', 'PREMIUM_AI', 'ENTERPRISE'].includes(plan.id) && (
                  <div className="openrouter-branding">
                    <span className="openrouter-text">
                      {t('premiumPlus.poweredByOpenAI', { defaultValue: 'powered by OpenAI' })}
                    </span>
                    <img
                      src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/openai.webp"
                      alt="OpenAI"
                      className="openrouter-logo openrouter-logo-light"
                    />
                    <img
                      src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/openai-light.webp"
                      alt="OpenAI"
                      className="openrouter-logo openrouter-logo-dark"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
