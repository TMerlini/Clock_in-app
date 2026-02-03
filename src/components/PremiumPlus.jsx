import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { STRIPE_PRICE_IDS, STRIPE_PAYMENT_LINKS, PLAN_NAMES, isStripeConfigured } from '../lib/stripeConfig';
import { getPlanConfig } from '../lib/planConfig';
import { initializeCalls } from '../lib/tokenManager';
import { Crown, Check, Sparkles, Zap, AlertCircle, Loader, ShoppingCart, Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './PremiumPlus.css';

export function PremiumPlus({ user, onNavigate }) {
  const { t } = useTranslation();
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);
  const [planConfig, setPlanConfig] = useState(null);

  useEffect(() => {
    getPlanConfig().then(setPlanConfig).catch(() => setPlanConfig(null));
  }, []);

  // Check if user is returning from Stripe checkout
  const checkStripeReturn = useCallback(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    const sessionId = urlParams.get('session_id');

    if (success || sessionId) {
      setSuccessMessage(t('premiumPlus.paymentSuccessful'));
        // Initialize calls for Premium AI if returning from successful payment
        const currentUser = auth.currentUser;
        if (currentUser) {
          try {
            const settingsRef = doc(db, 'userSettings', currentUser.uid);
            const settingsDoc = await getDoc(settingsRef);
            if (settingsDoc.exists()) {
              const settings = settingsDoc.data();
              const plan = (settings.subscriptionPlan || settings.plan || '').toLowerCase();
              if (plan === 'premium_ai' || plan === 'enterprise') {
                await initializeCalls(currentUser.uid);
              }
            }
          } catch (error) {
            console.error('Error initializing calls after payment:', error);
          }
        }
      // Reload subscription status after a brief delay
      setTimeout(() => {
        loadSubscriptionStatus();
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 2000);
    } else if (canceled) {
      setSuccessMessage(t('premiumPlus.paymentCanceled'));
      setTimeout(() => {
        setSuccessMessage(null);
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 5000);
    }
  }, [t]);

  useEffect(() => {
    loadSubscriptionStatus();
    checkStripeReturn();
  }, [user, checkStripeReturn]);

  const loadSubscriptionStatus = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const settingsRef = doc(db, 'userSettings', currentUser.uid);
      const settingsDoc = await getDoc(settingsRef);

      if (settingsDoc.exists()) {
        const settings = settingsDoc.data();
        // Check for subscription plan in settings
        const plan = settings.subscriptionPlan || settings.plan || null;
        setCurrentPlan(plan);
        
        // Initialize calls if user has Premium AI or Enterprise subscription but calls aren't initialized
        const planLower = plan && plan.toLowerCase();
        if (planLower === 'premium_ai' || planLower === 'enterprise') {
          const aiUsage = settings.aiUsage;
          if (!aiUsage || !aiUsage.callsAllocated) {
            try {
              await initializeCalls(currentUser.uid);
            } catch (error) {
              console.error('Error initializing calls:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId, planName) => {
    // Handle free plan - no Stripe checkout needed
    if (planId === 'FREE') {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) return;

        const settingsRef = doc(db, 'userSettings', currentUser.uid);
        await setDoc(settingsRef, {
          subscriptionPlan: 'free'
        }, { merge: true });

        setCurrentPlan('free');
        setSuccessMessage(t('premiumPlus.switchedToFree'));
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } catch (error) {
        console.error('Error updating to free plan:', error);
        alert('Error updating plan. Please try again.');
      }
      return;
    }

        // Initialize calls for Premium AI plan (Enterprise includes Premium AI benefits)
        if (planId === 'PREMIUM_AI' || planId === 'ENTERPRISE') {
          const currentUser = auth.currentUser;
          if (currentUser) {
            try {
              // Initialize calls when subscribing to Premium AI
              // This will be called again after successful payment, but it's idempotent
              await initializeCalls(currentUser.uid);
            } catch (error) {
              console.error('Error initializing calls:', error);
              // Don't block subscription flow if call initialization fails
            }
          }
        }

    if (!isStripeConfigured()) {
      alert('Stripe is not configured. Please contact support.');
      return;
    }

    setRedirecting(true);

    try {
      // Option 1: Use Stripe Payment Links (simplest, no backend needed)
      const paymentLink = STRIPE_PAYMENT_LINKS[planId];
      if (paymentLink) {
        const currentUser = auth.currentUser;
        const userId = currentUser?.uid || '';
        const checkoutUrl = paymentLink + (userId ? `?client_reference_id=${userId}` : '');
        window.location.href = checkoutUrl;
        setRedirecting(false);
        return;
      }
      if (planId === 'ENTERPRISE') {
        setRedirecting(false);
        alert(t('premiumPlus.plans.enterprise.feature7') || 'Contact sales for Enterprise pricing.');
        return;
      }

      // Option 2: Create Checkout Session via backend API
      // This requires a backend endpoint that creates a Stripe Checkout Session
      const priceId = STRIPE_PRICE_IDS[planId];
      if (!priceId) {
        throw new Error(`Price ID not found for ${planName} plan.`);
      }

      const currentUser = auth.currentUser;
      const userId = currentUser?.uid || '';
      const userEmail = currentUser?.email || '';

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: priceId,
          userId: userId,
          userEmail: userEmail,
          planName: planName,
          successUrl: `${window.location.origin}?page=premium-plus&success=true`,
          cancelUrl: `${window.location.origin}?page=premium-plus&canceled=true`
        })
      });

      if (response.ok) {
        const { url } = await response.json();
        window.location.href = url;
      } else {
        throw new Error('Backend endpoint not available. Please set up Stripe Payment Links or a backend API.');
      }
    } catch (error) {
      console.error('Error redirecting to Stripe:', error);
      alert(`Error redirecting to checkout: ${error.message}\n\nPlease ensure Stripe Payment Links are configured in your .env file, or set up a backend API endpoint.`);
      setRedirecting(false);
    }
  };

  const cfg = (id) => planConfig?.[id.toLowerCase()];
  const plans = [
    {
      id: 'FREE',
      name: t('premiumPlus.plans.free.name'),
      price: '€0',
      period: t('premiumPlus.plans.free.period', { defaultValue: 'month' }),
      icon: Zap,
      features: [
        t('premiumPlus.plans.free.feature1'),
        t('premiumPlus.plans.free.feature2'),
        t('premiumPlus.plans.free.feature3'),
        t('premiumPlus.plans.free.feature4')
      ],
      color: 'gray',
      isFree: true
    },
    {
      id: 'BASIC',
      name: t('premiumPlus.plans.basic.name'),
      price: cfg('basic')?.price ?? '€0.99',
      period: cfg('basic')?.period ?? t('premiumPlus.plans.basic.period', { defaultValue: 'month' }),
      icon: Zap,
      features: (cfg('basic')?.features?.length && cfg('basic').features.filter(Boolean).length) ? cfg('basic').features : [
        t('premiumPlus.plans.basic.feature1'),
        t('premiumPlus.plans.basic.feature2'),
        t('premiumPlus.plans.basic.feature3'),
        t('premiumPlus.plans.basic.feature4'),
        t('premiumPlus.plans.basic.feature5')
      ],
      color: 'blue'
    },
    {
      id: 'PRO',
      name: t('premiumPlus.plans.pro.name'),
      price: cfg('pro')?.price ?? '€4.99',
      period: cfg('pro')?.period ?? t('premiumPlus.plans.pro.period', { defaultValue: 'month' }),
      icon: Sparkles,
      features: (cfg('pro')?.features?.length && cfg('pro').features.filter(Boolean).length) ? cfg('pro').features : [
        t('premiumPlus.plans.pro.feature1'),
        t('premiumPlus.plans.pro.feature2'),
        t('premiumPlus.plans.pro.feature3'),
        t('premiumPlus.plans.pro.feature4'),
        t('premiumPlus.plans.pro.feature5'),
        t('premiumPlus.plans.pro.feature6')
      ],
      color: 'purple',
      popular: true
    },
    {
      id: 'PREMIUM_AI',
      name: t('premiumPlus.plans.premiumAi.name'),
      price: cfg('premium_ai')?.price ?? '€9.99',
      period: cfg('premium_ai')?.period ?? t('premiumPlus.plans.premiumAi.period', { defaultValue: 'month' }),
      icon: Crown,
      features: (cfg('premium_ai')?.features?.length && cfg('premium_ai').features.filter(Boolean).length) ? cfg('premium_ai').features : [
        t('premiumPlus.plans.premiumAi.feature1'),
        t('premiumPlus.plans.premiumAi.feature2'),
        t('premiumPlus.plans.premiumAi.feature3'),
        t('premiumPlus.plans.premiumAi.feature4'),
        t('premiumPlus.plans.premiumAi.feature5'),
        t('premiumPlus.plans.premiumAi.feature6'),
        t('premiumPlus.plans.premiumAi.feature7')
      ],
      color: 'gold'
    },
    {
      id: 'ENTERPRISE',
      name: t('premiumPlus.plans.enterprise.name'),
      price: cfg('enterprise')?.price ?? t('premiumPlus.plans.enterprise.price'),
      period: cfg('enterprise')?.period ?? t('premiumPlus.plans.enterprise.period', { defaultValue: 'month' }),
      icon: Building2,
      features: (() => {
        const maxCount = cfg('enterprise')?.maxPremiumUsers ?? 10;
        const replaceCount = (s) => (typeof s === 'string' ? s.replace(/\{\{count\}\}/g, String(maxCount)) : s);
        const raw = (cfg('enterprise')?.features?.length && cfg('enterprise').features.filter(Boolean).length)
          ? cfg('enterprise').features
          : [
              t('premiumPlus.plans.enterprise.feature1'),
              t('premiumPlus.plans.enterprise.feature2'),
              t('premiumPlus.plans.enterprise.feature3', { count: maxCount }),
              t('premiumPlus.plans.enterprise.feature4'),
              t('premiumPlus.plans.enterprise.feature5'),
              t('premiumPlus.plans.enterprise.feature6'),
              t('premiumPlus.plans.enterprise.feature7')
            ];
        return raw.map(replaceCount);
      })(),
      color: 'indigo'
    }
  ];

  const getButtonText = (plan) => {
    const planId = plan.id;
    // Free plan is always available and is the default
    if (planId === 'FREE') {
      if (!currentPlan || currentPlan.toLowerCase() === 'free') {
        return t('premiumPlus.currentPlan');
      }
      return t('premiumPlus.switchToPlan', { planName: plan.name });
    }

    if (!currentPlan || currentPlan.toLowerCase() === 'free') {
      return t('premiumPlus.subscribe');
    }
    
    const planHierarchy = { FREE: 0, BASIC: 1, PRO: 2, PREMIUM_AI: 3, ENTERPRISE: 4 };
    const currentLevel = planHierarchy[currentPlan.toUpperCase()] || 0;
    const targetLevel = planHierarchy[planId] || 0;

    if (currentPlan.toLowerCase() === planId.toLowerCase()) {
      return t('premiumPlus.currentPlan');
    }
    if (targetLevel > currentLevel) {
      return t('premiumPlus.switchToPlan', { planName: plan.name }); // Upgrade
    }
    if (targetLevel < currentLevel) {
      return t('premiumPlus.switchToPlan', { planName: plan.name }); // Downgrade
    }
    return t('premiumPlus.switchToPlan', { planName: plan.name });
  };

  const isCurrentPlan = (planId) => {
    // If no current plan, Free is the default
    if (!currentPlan && planId === 'FREE') {
      return true;
    }
    return currentPlan?.toLowerCase() === planId.toLowerCase();
  };

  const isButtonDisabled = (planId) => {
    const isCurrent = isCurrentPlan(planId);
    // Free plan button is disabled only if it's the current plan
    if (planId === 'FREE' && isCurrent) {
      return true;
    }
    // Other plans are disabled if current, redirecting, or loading
    return isCurrent || redirecting || loading;
  };

  if (loading) {
    return (
      <div className="premium-plus-container">
        <div className="loading">
          <Loader className="spinning" />
          <span>{t('premiumPlus.loadingPlans')}</span>
        </div>
      </div>
    );
  }

  if (!isStripeConfigured()) {
    return (
      <div className="premium-plus-container">
        <div className="error-state">
          <AlertCircle />
          <h2>Stripe Not Configured</h2>
          <p>Please configure Stripe API keys and price IDs in your environment variables.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="premium-plus-container">
      {successMessage && (
        <div className={`success-banner ${successMessage.includes('successful') ? 'success' : 'info'}`}>
          <Check size={20} />
          <span>{successMessage}</span>
        </div>
      )}
      <div className="premium-plus-header">
        <div className="header-content">
          <Crown className="header-icon" />
          <div>
            <h1>{t('premiumPlus.title')}</h1>
            <p>{t('premiumPlus.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="plans-grid">
        {plans.filter(plan => plan.id !== 'FREE').map((plan) => {
          const IconComponent = plan.icon;
          const isCurrent = isCurrentPlan(plan.id);
          const buttonText = getButtonText(plan);
          const disabled = isButtonDisabled(plan.id);

          return (
            <div
              key={plan.id}
              className={`plan-card ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}
            >
              {plan.popular && (
                <div className="popular-badge">{t('premiumPlus.plans.mostPopular')}</div>
              )}
              {isCurrent && (
                <div className="current-badge">
                  <Check size={16} />
                  <span>{t('premiumPlus.currentPlan')}</span>
                </div>
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
                  <span className="openrouter-text">{t('premiumPlus.poweredByOpenRouter', { defaultValue: 'powered by OpenRouter' })}</span>
                  <img
                    src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/open-router.webp"
                    alt="OpenRouter"
                    className="openrouter-logo openrouter-logo-light"
                  />
                  <img
                    src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/open-router-dark.webp"
                    alt="OpenRouter"
                    className="openrouter-logo openrouter-logo-dark"
                  />
                </div>
              )}

              <button
                className={`plan-button ${plan.color} ${isCurrent ? 'current' : ''}`}
                onClick={() => handleSubscribe(plan.id, plan.name)}
                disabled={disabled}
              >
                {redirecting && !plan.isFree ? (
                  <>
                    <Loader className="spinning" size={16} />
                    <span>{t('callPackPurchase.redirecting')}</span>
                  </>
                ) : (
                  buttonText
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom section: Free plan and AI packs card */}
      <div className="bottom-section">
        {/* Free plan displayed separately below */}
        {(() => {
          const freePlan = plans.find(plan => plan.id === 'FREE');
          if (!freePlan) return null;
          const IconComponent = freePlan.icon;
          const isCurrent = isCurrentPlan(freePlan.id);
          const buttonText = getButtonText(freePlan);
          const disabled = isButtonDisabled(freePlan.id);

          return (
            <div className="free-plan-card-wrapper">
              <div className={`plan-card free-plan-card ${isCurrent ? 'current' : ''}`}>
                {isCurrent && (
                  <div className="current-badge">
                    <Check size={16} />
                    <span>{t('premiumPlus.currentPlan')}</span>
                  </div>
                )}

                <div className="plan-header">
                  <div className={`plan-icon ${freePlan.color}`}>
                    <IconComponent size={32} />
                  </div>
                  <h2 className="plan-name">{freePlan.name}</h2>
                  <div className="plan-price">
                    <span className="price-amount">{freePlan.price}</span>
                    <span className="price-period">/{freePlan.period}</span>
                  </div>
                </div>

                <ul className="plan-features">
                  {freePlan.features.map((feature, index) => (
                    <li key={index}>
                      <Check size={18} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`plan-button ${freePlan.color} ${isCurrent ? 'current' : ''}`}
                  onClick={() => handleSubscribe(freePlan.id, freePlan.name)}
                  disabled={disabled}
                >
                  {buttonText}
                </button>
              </div>
            </div>
          );
        })()}

        {/* AI packs card for Premium AI, Pro, and Enterprise plans */}
        {currentPlan && ['premium_ai', 'pro', 'enterprise'].includes(currentPlan.toLowerCase()) && (
          <div className="call-pack-card-wrapper">
            <div className="call-pack-card">
              <div className="call-pack-content">
                <div>
                  <h3>{t('premiumPlus.needMoreCalls')}</h3>
                  <p>{t('premiumPlus.callPackDescription')}</p>
                </div>
                <div className="openrouter-branding call-pack-openrouter">
                  <span className="openrouter-text">{t('premiumPlus.poweredByOpenRouter', { defaultValue: 'powered by OpenRouter' })}</span>
                  <img
                    src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/open-router.webp"
                    alt="OpenRouter"
                    className="openrouter-logo openrouter-logo-light"
                  />
                  <img
                    src="https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/webp/open-router-dark.webp"
                    alt="OpenRouter"
                    className="openrouter-logo openrouter-logo-dark"
                  />
                </div>
                <button
                  className="call-pack-button"
                  onClick={() => onNavigate && onNavigate('call-pack-purchase')}
                >
                  <ShoppingCart size={18} />
                  <span>{t('premiumPlus.buyCallPacks')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="premium-plus-footer">
        <p>
          Paid plans include a 14-day free trial. Cancel anytime.
          <br />
          Questions? <button className="link-button" onClick={() => onNavigate && onNavigate('faq')}>Visit our FAQ</button>
        </p>
      </div>
    </div>
  );
}
