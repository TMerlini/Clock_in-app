import { useState } from 'react';
import { Cloud, CloudOff, AlertTriangle, RefreshCw } from 'lucide-react';
import './SyncStatusIndicator.css';

// Google Calendar Icon Component
const GoogleCalendarIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size}>
    <rect x="0" y="0" width="24" height="24" rx="2.5" fill="#fff"/>
    {/* Top-left blue section */}
    <rect x="0" y="0" width="10" height="10" fill="#4285f4"/>
    {/* Top-right yellow section */}
    <rect x="10" y="0" width="14" height="10" fill="#fbbc04"/>
    {/* Bottom-left green section */}
    <rect x="0" y="10" width="10" height="14" fill="#34a853"/>
    {/* Bottom-right red section */}
    <rect x="10" y="10" width="14" height="14" fill="#ea4335"/>
    {/* Curled corner effect on red section */}
    <path d="M22 24 L24 22 L24 24 Z" fill="#ea4335" opacity="0.6"/>
    {/* White center square with "12" */}
    <rect x="2.5" y="2.5" width="19" height="19" rx="1.5" fill="#fff"/>
    <text x="12" y="15.5" fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif" fontSize="10" fontWeight="700" fill="#4285f4" textAnchor="middle" dominantBaseline="middle">12</text>
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
