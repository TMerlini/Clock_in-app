import { useTranslation } from 'react-i18next';
import { X, Cloud } from 'lucide-react';
import './SessionEditor.css';
import './SyncOnVisitModal.css';

export function SyncOnVisitModal({ variant, onSync, onContinue }) {
  const { t } = useTranslation();

  const message =
    variant === 'not_connected'
      ? t('syncOnVisit.notConnectedMessage')
      : t('syncOnVisit.unsyncedMessage');

  const handleSync = () => {
    onSync();
  };

  const handleContinue = () => {
    onContinue();
  };

  return (
    <div className="modal-overlay" onClick={onContinue}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{t('syncOnVisit.title')}</h2>
          <button className="close-button" onClick={onContinue}>
            <X />
          </button>
        </div>

        <div className="modal-body">
          <div className="sync-on-visit-message">
            <Cloud className="sync-icon" size={24} />
            <p>{message}</p>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={handleContinue}>
            {t('syncOnVisit.continueOffline')}
          </button>
          <button className="save-button" onClick={handleSync}>
            {t('syncOnVisit.syncGoogle')}
          </button>
        </div>
      </div>
    </div>
  );
}
