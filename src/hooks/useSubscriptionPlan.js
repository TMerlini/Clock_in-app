import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../lib/firebase';

/**
 * Hook to get the current user's subscription plan.
 * @returns {{ plan: string|null, loading: boolean }}
 */
export function useSubscriptionPlan() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPlan = async (uid) => {
      if (!uid) {
        setPlan(null);
        setLoading(false);
        return;
      }
      try {
        const settingsRef = doc(db, 'userSettings', uid);
        const snap = await getDoc(settingsRef);
        const p = snap.exists()
          ? (snap.data().subscriptionPlan || snap.data().plan || 'free').toLowerCase()
          : 'free';
        setPlan(p);
      } catch (error) {
        console.error('Error loading subscription plan:', error);
        setPlan('free');
      } finally {
        setLoading(false);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setLoading(true);
      loadPlan(currentUser?.uid);
    });

    return () => unsubscribe();
  }, []);

  return { plan, loading };
}
