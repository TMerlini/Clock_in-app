import { Calendar, Check, X } from 'lucide-react';
import './CalendarAuthButton.css';

export function CalendarAuthButton({ isReady, isAuthorized, onAuthorize, onRevoke }) {
  if (!isReady) {
    return (
      <div className="calendar-auth-button loading">
        <Calendar />
        <span>Loading Calendar API...</span>
      </div>
    );
  }

  if (isAuthorized) {
    return (
      <div className="calendar-auth-status">
        <div className="auth-info">
          <Check className="check-icon" />
          <span>Auto-sync enabled</span>
        </div>
        <button className="disconnect-button" onClick={onRevoke}>
          <X />
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button className="calendar-auth-button" onClick={onAuthorize}>
      <Calendar />
      <div>
        <div className="button-title">Enable Calendar Auto-Sync</div>
        <div className="button-subtitle">Sessions will be added automatically</div>
      </div>
    </button>
  );
}
