import { useState } from 'react';
import { Cloud, CloudOff, AlertTriangle, RefreshCw } from 'lucide-react';
import './SyncStatusIndicator.css';

// Google Calendar Icon Component
const GoogleCalendarIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width={size} height={size}>
    <path fill="#fff" d="M152.637 47.363H47.363v105.273h105.273z"/>
    <path fill="#1a73e8" d="M121.491 94.49l-8.073-6.36-10.29 10.29-10.29-10.29-8.073 6.36 10.29 10.29-10.29 10.29 8.073 6.36 10.29-10.29 10.29 10.29 8.073-6.36-10.29-10.29z"/>
    <path fill="#ea4335" d="M152.637 47.363H47.363L18.182 76.545v79.091c0 9 7.364 16.364 16.364 16.364h12.727V98.182h38.182V47.363z"/>
    <path fill="#34a853" d="M47.363 172l35.455-35.455H47.363z"/>
    <path fill="#4285f4" d="M152.637 47.363v54.546h-54.546v70.091h73.637c9 0 16.364-7.364 16.364-16.364V76.545z"/>
    <path fill="#188038" d="M171.727 172H98.09V98.182h54.546v54.545h19.09z"/>
    <path fill="#fbbc04" d="M171.727 76.545h-35.454V47.363l35.454 29.182z"/>
    <path fill="#1967d2" d="M171.727 76.545l-35.454-29.182v29.182z"/>
    <rect fill="none" width="200" height="200"/>
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
