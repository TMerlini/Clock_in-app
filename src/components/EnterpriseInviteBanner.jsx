import { useState, useEffect } from 'react';
import { listPendingInvitesForUser, getEnterprise, acceptInvite, declineInvite } from '../lib/enterpriseHelpers';
import { useTranslation } from 'react-i18next';
import { Building2, Check, X } from 'lucide-react';
import './EnterpriseInviteBanner.css';

export function EnterpriseInviteBanner({ user, onAccept, onDecline }) {
  const { t } = useTranslation();
  const [invite, setInvite] = useState(null);
  const [enterpriseName, setEnterpriseName] = useState('');
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!user?.email) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const list = await listPendingInvitesForUser(user.email);
        if (cancelled) return;
        const first = list[0] || null;
        setInvite(first);
        if (first) {
          const ent = await getEnterprise(first.enterpriseId);
          if (!cancelled && ent) setEnterpriseName(ent.name || '');
        }
      } catch (e) {
        console.error('Enterprise invite banner load:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [user?.email]);

  const refetch = async () => {
    const list = await listPendingInvitesForUser(user?.email || '');
    const first = list[0] || null;
    setInvite(first);
    if (first) {
      const ent = await getEnterprise(first.enterpriseId);
      setEnterpriseName(ent?.name || '');
    } else {
      setEnterpriseName('');
    }
  };

  const handleAccept = async () => {
    if (!invite || acting) return;
    setActing(true);
    try {
      await acceptInvite(invite.id, user.uid, user.email);
      await refetch();
      onAccept?.();
    } catch (e) {
      console.error('Accept invite error:', e);
    } finally {
      setActing(false);
    }
  };

  const handleDecline = async () => {
    if (!invite || acting) return;
    setActing(true);
    try {
      await declineInvite(invite.id, user.email);
      await refetch();
      onDecline?.();
    } catch (e) {
      console.error('Decline invite error:', e);
    } finally {
      setActing(false);
    }
  };

  if (loading || !invite) return null;

  return (
    <div className="enterprise-invite-banner" role="alert">
      <Building2 size={20} className="enterprise-invite-banner-icon" />
      <span className="enterprise-invite-banner-text">
        {t('enterpriseInvite.invited')} <strong>{enterpriseName || t('enterpriseInvite.anOrganization')}</strong>.
      </span>
      <div className="enterprise-invite-banner-actions">
        <button
          type="button"
          className="enterprise-invite-btn accept"
          onClick={handleAccept}
          disabled={acting}
        >
          <Check size={16} />
          <span>{t('enterpriseInvite.accept')}</span>
        </button>
        <button
          type="button"
          className="enterprise-invite-btn decline"
          onClick={handleDecline}
          disabled={acting}
        >
          <X size={16} />
          <span>{t('enterpriseInvite.decline')}</span>
        </button>
      </div>
    </div>
  );
}
