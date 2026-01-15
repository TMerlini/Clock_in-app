// Stripe Configuration
// Stripe publishable key and Payment Links are configured here
// Payment Links are the simplest approach - no backend needed!

// Live Stripe publishable key
export const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_live_51SoN6lHy6KPYkr46cw7XOLVHFKqbElEql0ZVPWpGCaZI8mdIBWrXYzc1K9qaBeet7O0NlhZLkLkKsXvuRjp4S75n00aAuOp2PX';

// Stripe Payment Links - Direct links to Stripe Checkout
// These are the live Payment Links from your Stripe dashboard
export const STRIPE_PAYMENT_LINKS = {
  BASIC: import.meta.env.VITE_STRIPE_PAYMENT_LINK_BASIC || 'https://buy.stripe.com/3cI14n8le8LSb5acQXbjW00',
  PRO: import.meta.env.VITE_STRIPE_PAYMENT_LINK_PRO || 'https://buy.stripe.com/bJe14nbxq1jqehm2cjbjW01',
  PREMIUM_AI: import.meta.env.VITE_STRIPE_PAYMENT_LINK_PREMIUM_AI || 'https://buy.stripe.com/bJe4gz8le9PW0qw6szbjW02'
};

// Price IDs (optional - kept for reference, not needed with Payment Links)
export const STRIPE_PRICE_IDS = {
  BASIC: import.meta.env.VITE_STRIPE_PRICE_BASIC || '',
  PRO: import.meta.env.VITE_STRIPE_PRICE_PRO || '',
  PREMIUM_AI: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_AI || ''
};

// Plan names mapping
export const PLAN_NAMES = {
  BASIC: 'basic',
  PRO: 'pro',
  PREMIUM_AI: 'premium-ai'
};

// Check if Stripe is configured
export const isStripeConfigured = () => {
  return !!STRIPE_PUBLISHABLE_KEY;
};

// Check if Payment Links are configured (simpler, no backend needed)
export const hasPaymentLinks = () => {
  return !!STRIPE_PAYMENT_LINKS.BASIC && 
         !!STRIPE_PAYMENT_LINKS.PRO && 
         !!STRIPE_PAYMENT_LINKS.PREMIUM_AI;
};
