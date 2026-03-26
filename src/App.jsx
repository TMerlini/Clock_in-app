import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { Login } from './components/Login';
import { ClockInApp } from './components/ClockInApp';
import { Loader } from './components/Loader';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user?.uid && typeof window !== 'undefined') {
      window.scaffoldPush?.identify(user.uid);
    }
  }, [user?.uid]);

  // Ensure userSettings exists for all authenticated users (including free/basic who can't access Settings)
  // so they appear in Admin User Management
  useEffect(() => {
    if (!user?.uid) return;

    const ensureUserSettings = async () => {
      try {
        const ref = doc(db, 'userSettings', user.uid);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          await setDoc(ref, {
            email: user.email,
            subscriptionPlan: 'free',
            plan: 'free',
            createdAt: serverTimestamp()
          });
          // Send pending welcome push (if user was invited as guest)
          try {
            const token = await user.getIdToken();
            const base = typeof window !== 'undefined' ? window.location.origin : '';
            await fetch(`${base}/api/send-pending-welcome-push`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              }
            });
          } catch (pushErr) {
            console.warn('Pending welcome push check failed:', pushErr);
          }
          // Send welcome email
          try {
            await fetch(`${base}/api/send-welcome`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            });
          } catch (emailErr) {
            console.warn('Welcome email failed:', emailErr);
          }
        }
      } catch (err) {
        console.error('Failed to ensure userSettings:', err);
      }
    };

    ensureUserSettings();
  }, [user?.uid, user?.email]);

  useEffect(() => {
    // Show loader for minimum 2.5 seconds
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (loading || showLoader) {
    return <Loader />;
  }

  return (
    <ErrorBoundary>
      {user ? <ClockInApp user={user} /> : <Login onLogin={setUser} />}
    </ErrorBoundary>
  );
}

export default App;
