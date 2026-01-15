import { memo, useState, useEffect } from 'react';
import { Clock, AlertTriangle, TrendingUp, Coffee, UtensilsCrossed } from 'lucide-react';
import { format } from 'date-fns';
import { formatHoursMinutes } from '../lib/utils';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { PremiumPromoBar } from './PremiumPromoBar';
import './ClockInApp.css';

export const HomePage = memo(function HomePage({
  isClockedIn,
  clockInTime,
  currentElapsedTime,
  currentTotalHours,
  currentBreakdown,
  sessionsForDate,
  onClockInOut,
  formatTime,
  getWorkingMessage,
  onNavigate
}) {
  const [isPremium, setIsPremium] = useState(false);

  // Check subscription status
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setIsPremium(false);
          return;
        }

        const settingsRef = doc(db, 'userSettings', user.uid);
        const settingsDoc = await getDoc(settingsRef);
        
        if (settingsDoc.exists()) {
          const settings = settingsDoc.data();
          const subscriptionPlan = settings.subscriptionPlan || settings.plan || null;
          // Check if user has premium (any plan that's not 'free' or null)
          setIsPremium(subscriptionPlan && subscriptionPlan !== 'free');
        } else {
          setIsPremium(false);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsPremium(false);
      }
    };

    checkSubscription();
  }, []);
  const totalDayHours = sessionsForDate.reduce((sum, s) => sum + s.totalHours, 0);
  const totalUnpaid = sessionsForDate.reduce((sum, s) => sum + s.unpaidExtraHours, 0);
  const totalPaid = sessionsForDate.reduce((sum, s) => sum + s.paidExtraHours, 0);
  const totalLunchTime = sessionsForDate.reduce((sum, s) => sum + (s.lunchDuration || 0), 0);
  const totalExpenses = sessionsForDate.reduce((sum, s) => sum + (s.lunchAmount || 0) + (s.dinnerAmount || 0), 0);
  const firstSession = sessionsForDate.length > 0 ? sessionsForDate[sessionsForDate.length - 1] : null;
  const lastSession = sessionsForDate.length > 0 ? sessionsForDate[0] : null;

  return (
    <div className="main-content">
      <div className="homepage-left">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Time Tracker</h2>
          </div>
          <div className="card-content">
            <button
              onClick={onClockInOut}
              className={`clock-button ${isClockedIn ? 'clocked-in' : 'clocked-out'}`}
            >
              <span>{isClockedIn ? 'Clock Out' : 'Clock In'}</span>
            </button>

            {isClockedIn && (
              <div className="timer-section">
                <p className="timer-title">Elapsed Time</p>
                <div className="elapsed-time">
                  {formatTime(currentElapsedTime)}
                </div>

                <div className="working-message">
                  {getWorkingMessage(currentTotalHours)}
                </div>

                <div className="time-breakdown">
                  <div className="time-category regular">
                    <span className="time-category-label">Regular Hours (0-8h)</span>
                    <span className="time-category-value">{formatHoursMinutes(currentBreakdown.regularHours)}</span>
                  </div>

                  {currentTotalHours > 8 && (
                    <div className="time-category unpaid">
                      <span className="time-category-label">Unpaid Extra (8-10h)</span>
                      <span className="time-category-value">{formatHoursMinutes(currentBreakdown.unpaidExtraHours)}</span>
                    </div>
                  )}

                  {currentTotalHours > 10 && (
                    <div className="time-category paid">
                      <span className="time-category-label">Paid Extra (10h+)</span>
                      <span className="time-category-value">{formatHoursMinutes(currentBreakdown.paidExtraHours)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="homepage-right">
        {/* Daily Stats Cards */}
        <div className="daily-stats-grid">
          <div className="daily-stat-card">
            <div className="daily-stat-icon hours">
              <Clock />
            </div>
            <div className="daily-stat-content">
              <div className="daily-stat-label">Hours Day</div>
              <div className="daily-stat-value">{formatHoursMinutes(totalDayHours)}</div>
            </div>
          </div>

          <div className="daily-stat-card">
            <div className="daily-stat-icon isencao">
              <AlertTriangle />
            </div>
            <div className="daily-stat-content">
              <div className="daily-stat-label">Isenção</div>
              <div className="daily-stat-value">{formatHoursMinutes(totalUnpaid)}</div>
            </div>
          </div>

          <div className="daily-stat-card">
            <div className="daily-stat-icon overwork">
              <TrendingUp />
            </div>
            <div className="daily-stat-content">
              <div className="daily-stat-label">Overwork</div>
              <div className="daily-stat-value">{formatHoursMinutes(totalPaid)}</div>
            </div>
          </div>

          <div className="daily-stat-card">
            <div className="daily-stat-icon lunch">
              <Coffee />
            </div>
            <div className="daily-stat-content">
              <div className="daily-stat-label">Lunch Time</div>
              <div className="daily-stat-value">{formatHoursMinutes(totalLunchTime)}</div>
            </div>
          </div>

          <div className="daily-stat-card">
            <div className="daily-stat-icon expenses">
              <UtensilsCrossed />
            </div>
            <div className="daily-stat-content">
              <div className="daily-stat-label">Expenses</div>
              <div className="daily-stat-value">€{totalExpenses.toFixed(2)}</div>
            </div>
          </div>

          <div className="daily-stat-card">
            <div className="daily-stat-icon clock-times">
              <Clock />
            </div>
            <div className="daily-stat-content">
              <div className="daily-stat-label">Clock In/Out</div>
              <div className="daily-stat-value clock-io-times">
                {firstSession ? (
                  <>
                    <span className="clock-in-time">{format(new Date(firstSession.clockIn), 'HH:mm')}</span>
                    <span className="clock-separator">→</span>
                    <span className="clock-out-time">{format(new Date(lastSession.clockOut), 'HH:mm')}</span>
                  </>
                ) : (
                  <span className="no-data">--:--</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Premium Promotion Bar - Only show for non-premium users */}
        {!isPremium && (
          <PremiumPromoBar onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
});
