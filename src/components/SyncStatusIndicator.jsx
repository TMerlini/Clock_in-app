import { useState, useEffect } from 'react';
import { Cloud, CloudOff, AlertTriangle, RefreshCw } from 'lucide-react';
import './SyncStatusIndicator.css';

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
      className={`sync-indicator ${status.color}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
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
      
      {showTooltip && (
        <div className="sync-tooltip">
          {status.text}
        </div>
      )}
    </div>
  );
}
