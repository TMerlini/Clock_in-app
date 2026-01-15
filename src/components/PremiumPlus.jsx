import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { STRIPE_PRICE_IDS, STRIPE_PAYMENT_LINKS, PLAN_NAMES, isStripeConfigured, hasPaymentLinks } from '../lib/stripeConfig';
import { Crown, Check, Sparkles, Zap, AlertCircle, Loader } from 'lucide-react';
import './PremiumPlus.css';

export function PremiumPlus({ user, onNavigate }) {
  const [currentPlan, setCurrentPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadSubscriptionStatus();
    checkStripeReturn();
  }, [user]);

  // Check if user is returning from Stripe checkout
  const checkStripeReturn = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const canceled = urlParams.get('canceled');
    const sessionId = urlParams.get('session_id');

    if (success || sessionId) {
      setSuccessMessage('Payment successful! Your subscription is being activated...');
      // Reload subscription status after a brief delay
      setTimeout(() => {
        loadSubscriptionStatus();
        // Clear URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 2000);
    } else if (canceled) {
      setSuccessMessage('Payment was canceled. You can try again anytime.');
      setTimeout(() => {
        setSuccessMessage(null);
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 5000);
    }
  };

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
        setSuccessMessage('Successfully switched to Free plan!');
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } catch (error) {
        console.error('Error updating to free plan:', error);
        alert('Error updating plan. Please try again.');
      }
      return;
    }

    if (!isStripeConfigured()) {
      alert('Stripe is not configured. Please contact support.');
      return;
    }

    setRedirecting(true);

    try {
      // Option 1: Use Stripe Payment Links (simplest, no backend needed)
      if (hasPaymentLinks()) {
        const paymentLink = STRIPE_PAYMENT_LINKS[planId];
        if (paymentLink) {
          // Get current user ID for metadata (can be added to Payment Link as query param)
          const currentUser = auth.currentUser;
          const userId = currentUser?.uid || '';
          const checkoutUrl = paymentLink + (userId ? `?client_reference_id=${userId}` : '');
          window.location.href = checkoutUrl;
          return;
        }
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

  const plans = [
    {
      id: 'FREE',
      name: 'Free',
      price: '€0',
      period: 'month',
      icon: Zap,
      features: [
        'Core time tracking',
        'Basic session management',
        'Limited analytics',
        'Basic export'
      ],
      color: 'gray',
      isFree: true
    },
    {
      id: 'BASIC',
      name: 'Basic',
      price: '€0.99',
      period: 'month',
      icon: Zap,
      features: [
        'Everything in Free',
        'Full analytics',
        'Google Calendar sync',
        'Advanced session management',
        'Export sessions'
      ],
      color: 'blue'
    },
    {
      id: 'PRO',
      name: 'Pro',
      price: '€4.99',
      period: 'month',
      icon: Sparkles,
      features: [
        'Everything in Basic',
        'Advanced analytics',
        'Detailed reports',
        'Export functionality',
        'Priority support',
        'Custom date ranges'
      ],
      color: 'purple',
      popular: true
    },
    {
      id: 'PREMIUM_AI',
      name: 'Premium AI',
      price: '€9.99',
      period: 'month',
      icon: Crown,
      features: [
        'Everything in Pro',
        'AI Advisor access',
        'Personalized insights',
        'Advanced recommendations',
        'Work pattern analysis',
        'Time optimization tips'
      ],
      color: 'gold'
    }
  ];

  const getButtonText = (planId) => {
    // Free plan is always available and is the default
    if (planId === 'FREE') {
      if (!currentPlan || currentPlan.toLowerCase() === 'free') {
        return 'Current Plan';
      }
      return 'Downgrade';
    }

    if (!currentPlan || currentPlan.toLowerCase() === 'free') {
      return 'Subscribe';
    }
    
    const planHierarchy = { FREE: 0, BASIC: 1, PRO: 2, PREMIUM_AI: 3 };
    const currentLevel = planHierarchy[currentPlan.toUpperCase()] || 0;
    const targetLevel = planHierarchy[planId] || 0;

    if (currentPlan.toLowerCase() === planId.toLowerCase()) {
      return 'Current Plan';
    }
    if (targetLevel > currentLevel) {
      return 'Upgrade';
    }
    if (targetLevel < currentLevel) {
      return 'Downgrade';
    }
    return 'Subscribe';
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
          <span>Loading plans...</span>
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
            <h1>Premium+ Plans</h1>
            <p>Choose the plan that's right for you</p>
          </div>
        </div>
      </div>

      <div className="plans-grid">
        {plans.map((plan) => {
          const IconComponent = plan.icon;
          const isCurrent = isCurrentPlan(plan.id);
          const buttonText = getButtonText(plan.id);
          const disabled = isButtonDisabled(plan.id);

          return (
            <div
              key={plan.id}
              className={`plan-card ${plan.popular ? 'popular' : ''} ${isCurrent ? 'current' : ''}`}
            >
              {plan.popular && (
                <div className="popular-badge">Most Popular</div>
              )}
              {isCurrent && (
                <div className="current-badge">
                  <Check size={16} />
                  <span>Current Plan</span>
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

              <button
                className={`plan-button ${plan.color} ${isCurrent ? 'current' : ''}`}
                onClick={() => handleSubscribe(plan.id, plan.name)}
                disabled={disabled}
              >
                {redirecting && !plan.isFree ? (
                  <>
                    <Loader className="spinning" size={16} />
                    <span>Redirecting...</span>
                  </>
                ) : (
                  buttonText
                )}
              </button>
            </div>
          );
        })}
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
