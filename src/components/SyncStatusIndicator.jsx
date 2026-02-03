import { useState, useEffect, useRef } from 'react';
import { Cloud, CloudOff, AlertTriangle, RefreshCw } from 'lucide-react';
import { syncUnsyncedSessions } from '../lib/syncCalendarSessions';
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
  const [isSyncing, setIsSyncing] = useState(false);
  const hasAutoRefreshed = useRef(false);

  // Automatically refresh token when 8 minutes before expiry or when expired
  useEffect(() => {
    const minutes = googleCalendar.tokenExpiryMinutes;
    const shouldRefresh = googleCalendar.isAuthorized && 
      ((minutes !== null && minutes <= 8) || googleCalendar.isTokenExpired);
    
    if (shouldRefresh && !hasAutoRefreshed.current && !isRefreshing) {
      console.log('Token warning/expiry detected, attempting automatic refresh...');
      hasAutoRefreshed.current = true;
      googleCalendar.refreshToken();
    } else if (minutes !== null && minutes > 8 && !googleCalendar.isTokenExpired) {
      // Reset the ref when token becomes valid again (more than 8 minutes remaining)
      hasAutoRefreshed.current = false;
    }
  }, [googleCalendar.isTokenExpired, googleCalendar.tokenExpiryMinutes, googleCalendar.isAuthorized, isRefreshing, googleCalendar]);

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

  const handleSync = async () => {
    if (isSyncing || !googleCalendar.isAuthorized) return;

    setIsSyncing(true);
    try {
      await syncUnsyncedSessions(googleCalendar);
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatus = () => {
    if (!googleCalendar.isReady) {
      return { icon: CloudOff, color: 'gray', text: 'Calendar API loading...', clickable: false };
    }
    if (!googleCalendar.isAuthorized) {
      if (googleCalendar.isTokenExpired) {
        return { icon: AlertTriangle, color: 'warning', text: 'Token expired - click to refresh', clickable: true };
      }
      return { icon: CloudOff, color: 'disconnected', text: 'Calendar not connected - click to authorize', clickable: true };
    }
    
    const minutes = googleCalendar.tokenExpiryMinutes;
    if (minutes !== null && minutes <= 10) {
      return { 
        icon: AlertTriangle, 
        color: 'warning', 
        text: `Token expires in ${minutes} min - click to refresh`, 
        clickable: true 
      };
    }
    
    return { 
      icon: Cloud, 
      color: 'connected', 
      text: minutes ? `Calendar synced (${minutes} min remaining) - click to sync pending sessions` : 'Calendar synced - click to sync pending sessions',
      clickable: true 
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;
  const isActive = isRefreshing || isSyncing;

  const handleClick = () => {
    if (!status.clickable || isActive) return;
    
    if (status.color === 'warning' || googleCalendar.isTokenExpired) {
      handleRefresh();
    } else if (status.color === 'disconnected' && !googleCalendar.isAuthorized) {
      googleCalendar.requestAuthorization();
    } else if (status.color === 'connected' && googleCalendar.isAuthorized) {
      handleSync();
    }
  };

  return (
    <div 
      className={`sync-indicator-wrapper`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div 
        className={`sync-indicator ${status.color} ${status.clickable ? 'clickable' : ''}`}
        onClick={handleClick}
        role="button"
        tabIndex={status.clickable ? 0 : -1}
        aria-label={status.text}
      >
        {isActive ? (
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
