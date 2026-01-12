import { useState } from 'react';
import { Cloud, CloudOff, AlertTriangle, RefreshCw } from 'lucide-react';
import './SyncStatusIndicator.css';

// Google Calendar Icon Component
const GoogleCalendarIcon = ({ size = 16 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-11.4 -19 98.8 114" width={size} height={size}>
    <path fill="#fff" d="M58 18H18v40h40z"/>
    <path fill="#1a73e8" d="M45 40.3L42 37l-4.8 4.8-4.8-4.7-3 3 4.8 4.7-4.8 4.8 3 3 4.8-4.8 4.8 4.8 3-3-4.8-4.8z"/>
    <path fill="#ea4335" d="M58 18H18L5 31v32c0 3.3 2.7 6 6 6h6V38h14V18z"/>
    <path fill="#34a853" d="M18 69l13-13H18z"/>
    <path fill="#4285f4" d="M58 18v20H38v31h27c3.3 0 6-2.7 6-6V31z"/>
    <path fill="#188038" d="M65 69H38V38h20v20h13z"/>
    <path fill="#fbbc04" d="M71 38H58V18l13 13z"/>
    <path fill="#1967d2" d="M71 31L58 18v13z"/>
  </svg>
);

export function SyncStatusIndicator({ googleCalendar }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      googleCalendar.refreshToken();
      // Wait a bit for the token to refresh
      setTimeout(() => setIsRefreshing(false), 2000);
    } catch (error) {
      console.error('Failed to refresh token:', error);
      setIsRefreshing(false);
    }
  };

  const getStatus = () => {
    if (!googleCalendar.isReady) {
      return { icon: CloudOff, color: 'gray', text: 'Calendar API loading...' };
    }
    if (!googleCalendar.isAuthorized) {
      if (googleCalendar.isTokenExpired) {
        return { icon: AlertTriangle, color: 'warning', text: 'Token expired - click to refresh' };
      }
      return { icon: CloudOff, color: 'disconnected', text: 'Calendar not connected' };
    }
    
    const minutes = googleCalendar.tokenExpiryMinutes;
    if (minutes !== null && minutes <= 10) {
      return { 
        icon: AlertTriangle, 
        color: 'warning', 
        text: `Token expires in ${minutes} min - click to refresh` 
      };
    }
    
    return { 
      icon: Cloud, 
      color: 'connected', 
      text: minutes ? `Calendar synced (${minutes} min remaining)` : 'Calendar synced' 
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <div 
      className={`sync-indicator-wrapper`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div 
        className={`sync-indicator ${status.color}`}
        onClick={() => {
          if (status.color === 'warning' || googleCalendar.isTokenExpired) {
            handleRefresh();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={status.text}
      >
        {isRefreshing ? (
          <RefreshCw className="sync-icon spinning" size={16} />
        ) : (
          <StatusIcon className="sync-icon" size={16} />
        )}
      </div>
      <div className="calendar-icon-wrapper">
        <GoogleCalendarIcon size={18} />
      </div>
      
      {showTooltip && (
        <div className="sync-tooltip">
          {status.text}
        </div>
      )}
    </div>
  );
}
