import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getCallStatus, getCallPacksStatus, addCallPack } from '../lib/tokenManager';
import { STRIPE_PAYMENT_LINKS, hasPaymentLinks } from '../lib/stripeConfig';
import { Zap, Check, AlertCircle, Loader, ShoppingCart } from 'lucide-react';
import './CallPackPurchase.css';

export function CallPackPurchase({ onNavigate }) {
  const [callStatus, setCallStatus] = useState(null);
  const [packsStatus, setPacksStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadCallStatus();
    checkPurchaseReturn();
  }, []);

  // Check if returning from Stripe purchase
  const checkPurchaseReturn = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const packPurchase = urlParams.get('pack_purchase');

    if (success && packPurchase === 'true') {
      setSuccessMessage('Payment successful! Adding call pack to your account...');
      
      // Get current user
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          // Add call pack (50 calls)
          await addCallPack(currentUser.uid, 50);
          setSuccessMessage('Call pack purchased! +50 calls added to your account.');
          
          // Reload status
          await loadCallStatus();
          
          // Clear URL parameters
          setTimeout(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            setSuccessMessage(null);
          }, 3000);
        } catch (error) {
          console.error('Error adding call pack:', error);
          setSuccessMessage('Payment received, but error adding pack. Please contact support.');
        }
      }
    }
  };

  const loadCallStatus = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const status = await getCallStatus(currentUser.uid);
      const packs = await getCallPacksStatus(currentUser.uid);
      
      setCallStatus(status);
      setPacksStatus(packs);
    } catch (error) {
      console.error('Error loading call status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchasePack = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      alert('Please log in to purchase call packs.');
      return;
    }

    // Get Stripe payment link for call pack (need to configure this)
    // For now, use a placeholder - you'll need to create this in Stripe
    const CALL_PACK_PAYMENT_LINK = import.meta.env.VITE_STRIPE_PAYMENT_LINK_CALL_PACK || '';

    if (!CALL_PACK_PAYMENT_LINK) {
      alert('Call pack purchase is not yet configured. Please contact support.');
      return;
    }

    setPurchasing(true);
    
    try {
      // Add user ID to payment link for tracking
      const userId = currentUser.uid;
      const checkoutUrl = CALL_PACK_PAYMENT_LINK + `?client_reference_id=${userId}&pack_purchase=true`;
      
      // Redirect to Stripe
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error redirecting to payment:', error);
      alert('Error redirecting to payment. Please try again.');
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="call-pack-purchase-container">
        <div className="loading">
          <Loader className="spinning" />
          <span>Loading call status...</span>
        </div>
      </div>
    );
  }

  if (!callStatus) {
    return (
      <div className="call-pack-purchase-container">
        <div className="error-state">
          <AlertCircle />
          <h2>Unable to load call status</h2>
          <p>Please ensure you have a Premium AI subscription.</p>
        </div>
      </div>
    );
  }

  const baseRemaining = callStatus.callsRemaining || 0;
  const packsRemaining = callStatus.packsRemaining || 0;
  const totalAvailable = callStatus.totalAvailable || 0;
  const totalUsed = callStatus.callsUsed || 0;

  return (
    <div className="call-pack-purchase-container">
      {successMessage && (
        <div className="success-banner">
          <Check size={20} />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="call-pack-header">
        <div className="header-content">
          <Zap className="header-icon" />
          <div>
            <h1>AI Call Packs</h1>
            <p>Purchase additional AI Advisor calls with Portuguese labor law expertise and HR guidance. Get expert compliance analysis, legal limit calculations, and best practice recommendations.</p>
          </div>
        </div>
      </div>

      <div className="current-status-card">
        <h2>Your Current Status</h2>
        <div className="status-grid">
          <div className="status-item">
            <div className="status-label">Base Calls</div>
            <div className="status-value">
              {baseRemaining}/{callStatus.callsAllocated}
            </div>
            <div className="status-sublabel">Resets monthly</div>
          </div>
          <div className="status-item">
            <div className="status-label">Call Packs</div>
            <div className="status-value">{packsRemaining} calls</div>
            <div className="status-sublabel">Never expire</div>
          </div>
          <div className="status-item highlight">
            <div className="status-label">Total Available</div>
            <div className="status-value">{totalAvailable} calls</div>
            <div className="status-sublabel">Ready to use</div>
          </div>
        </div>
      </div>

      <div className="call-pack-options">
        <h2>Purchase Call Pack</h2>
        <p className="value-proposition">
          Each call gives you access to AI-powered analysis of your work patterns against Portuguese labor law (Código do Trabalho), helping you stay compliant and make informed decisions about your time.
        </p>
        <div className="pack-card">
          <div className="pack-header">
            <Zap className="pack-icon" />
            <div className="pack-info">
              <h3>+50 Calls Pack</h3>
              <p className="pack-description">50 AI Advisor calls with Portuguese labor law & HR expertise. Never expire, perfect for compliance monitoring and professional guidance.</p>
            </div>
            <div className="pack-price">€4.99</div>
          </div>
          <div className="pack-features">
            <div className="feature-item">
              <Check size={18} />
              <span>50 additional calls</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>Never expire (roll over indefinitely)</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>Used after base allocation is exhausted</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>Portuguese labor law compliance analysis</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>Legal limit calculations (overtime, Isenção, vacation)</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>HR best practices and work-life balance guidance</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>Compliance monitoring and proactive alerts</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>Expert advice on work patterns and productivity</span>
            </div>
          </div>
          <button
            className="purchase-button"
            onClick={handlePurchasePack}
            disabled={purchasing}
          >
            {purchasing ? (
              <>
                <Loader className="spinning" size={16} />
                <span>Redirecting...</span>
              </>
            ) : (
              <>
                <ShoppingCart size={18} />
                <span>Purchase +50 Calls for €4.99</span>
              </>
            )}
          </button>
        </div>
      </div>

      {packsStatus && packsStatus.totalPacks > 0 && (
        <div className="packs-history">
          <h2>Your Call Packs ({packsStatus.totalPacks})</h2>
          <div className="packs-list">
            {packsStatus.packs.map((pack, index) => (
              <div key={pack.id || index} className="pack-item">
                <div className="pack-item-info">
                  <div className="pack-item-size">{pack.calls || 50} calls</div>
                  <div className="pack-item-details">
                    Purchased: {new Date(pack.purchasedAt?.toDate() || Date.now()).toLocaleDateString()}
                  </div>
                </div>
                <div className="pack-item-remaining">
                  {pack.remaining || 0} remaining
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
