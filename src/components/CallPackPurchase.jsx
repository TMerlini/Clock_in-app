import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { getCallStatus, getCallPacksStatus, addCallPack } from '../lib/tokenManager';
import { getPlanConfig } from '../lib/planConfig';
import { STRIPE_PAYMENT_LINKS, hasPaymentLinks } from '../lib/stripeConfig';
import { Zap, Check, AlertCircle, Loader, ShoppingCart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './CallPackPurchase.css';

export function CallPackPurchase({ onNavigate }) {
  const { t } = useTranslation();
  const [callStatus, setCallStatus] = useState(null);
  const [packsStatus, setPacksStatus] = useState(null);
  const [planConfig, setPlanConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    loadCallStatus();
    checkPurchaseReturn();
    getPlanConfig().then(setPlanConfig).catch(() => setPlanConfig(null));
  }, []);

  // Check if returning from Stripe purchase
  const checkPurchaseReturn = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const packPurchase = urlParams.get('pack_purchase');

    if (success && packPurchase === 'true') {
      setSuccessMessage(t('callPackPurchase.paymentSuccess'));
      
      // Get current user
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const config = await getPlanConfig();
          const packSize = config?.callPack?.packSize ?? 50;
          await addCallPack(currentUser.uid, packSize);
          setSuccessMessage(t('callPackPurchase.packPurchased'));
          
          // Reload status
          await loadCallStatus();
          
          // Clear URL parameters
          setTimeout(() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            setSuccessMessage(null);
          }, 3000);
        } catch (error) {
          console.error('Error adding call pack:', error);
          setSuccessMessage(t('callPackPurchase.paymentReceivedError'));
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
      alert(t('callPackPurchase.pleaseLogin'));
      return;
    }

    // Resolve payment link: admin-configured (Firestore) then env
    const paymentLink = (planConfig?.callPack?.paymentLink?.trim()) || (import.meta.env.VITE_STRIPE_PAYMENT_LINK_CALL_PACK || '');

    if (!paymentLink) {
      alert(t('callPackPurchase.notConfigured'));
      return;
    }

    setPurchasing(true);
    
    try {
      // Add user ID to payment link for tracking
      const userId = currentUser.uid;
      const checkoutUrl = paymentLink + `?client_reference_id=${userId}&pack_purchase=true`;
      
      // Redirect to Stripe
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Error redirecting to payment:', error);
      alert(t('callPackPurchase.errorRedirecting'));
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="call-pack-purchase-container">
        <div className="loading">
          <Loader className="spinning" />
          <span>{t('callPackPurchase.loadingStatus')}</span>
        </div>
      </div>
    );
  }

  if (!callStatus) {
    return (
      <div className="call-pack-purchase-container">
        <div className="error-state">
          <AlertCircle />
          <h2>{t('callPackPurchase.unableToLoad')}</h2>
          <p>{t('callPackPurchase.ensureSubscription')}</p>
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
            <h1>{t('callPackPurchase.title')}</h1>
            <p>{t('callPackPurchase.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="current-status-card">
        <h2>{t('callPackPurchase.currentStatus')}</h2>
        <div className="status-grid">
          <div className="status-item">
            <div className="status-label">{t('callPackPurchase.baseCalls')}</div>
            <div className="status-value">
              {baseRemaining}/{callStatus.callsAllocated}
            </div>
            <div className="status-sublabel">{t('callPackPurchase.resetsMonthly')}</div>
          </div>
          <div className="status-item">
            <div className="status-label">{t('callPackPurchase.callPacks')}</div>
            <div className="status-value">{packsRemaining} {t('callPackPurchase.calls')}</div>
            <div className="status-sublabel">{t('callPackPurchase.neverExpire')}</div>
          </div>
          <div className="status-item highlight">
            <div className="status-label">{t('callPackPurchase.totalAvailable')}</div>
            <div className="status-value">{totalAvailable} {t('callPackPurchase.calls')}</div>
            <div className="status-sublabel">{t('callPackPurchase.readyToUse')}</div>
          </div>
        </div>
      </div>

      <div className="call-pack-options">
        <h2>{t('callPackPurchase.purchaseCallPack')}</h2>
        <p className="value-proposition">
          {t('callPackPurchase.valueProposition')}
        </p>
        <div className="pack-card">
          <div className="pack-header">
            <Zap className="pack-icon" />
            <div className="pack-info">
              <h3>{t('callPackPurchase.packTitle')}</h3>
              <p className="pack-description">{t('callPackPurchase.packDescription')}</p>
            </div>
            <div className="pack-price">{t('callPackPurchase.packPrice')}</div>
          </div>
          <div className="pack-features">
            <div className="feature-item">
              <Check size={18} />
              <span>{t('callPackPurchase.feature1')}</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>{t('callPackPurchase.feature2')}</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>{t('callPackPurchase.feature3')}</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>{t('callPackPurchase.feature4')}</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>{t('callPackPurchase.feature5')}</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>{t('callPackPurchase.feature6')}</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>{t('callPackPurchase.feature7')}</span>
            </div>
            <div className="feature-item">
              <Check size={18} />
              <span>{t('callPackPurchase.feature8')}</span>
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
                <span>{t('callPackPurchase.redirecting')}</span>
              </>
            ) : (
              <>
                <ShoppingCart size={18} />
                <span>{t('callPackPurchase.purchaseButton')}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {packsStatus && packsStatus.totalPacks > 0 && (
        <div className="packs-history">
          <h2>{t('callPackPurchase.yourCallPacks')} ({packsStatus.totalPacks})</h2>
          <div className="packs-list">
            {packsStatus.packs.map((pack, index) => (
              <div key={pack.id || index} className="pack-item">
                <div className="pack-item-info">
                  <div className="pack-item-size">{pack.calls || 50} {t('callPackPurchase.calls')}</div>
                  <div className="pack-item-details">
                    {t('callPackPurchase.purchased')}: {new Date(pack.purchasedAt?.toDate() || Date.now()).toLocaleDateString()}
                  </div>
                </div>
                <div className="pack-item-remaining">
                  {pack.remaining || 0} {t('callPackPurchase.remaining')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
