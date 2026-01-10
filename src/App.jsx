import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Login } from './components/Login';
import { ClockInApp } from './components/ClockInApp';
import { Loader } from './components/Loader';

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
    // Show loader for minimum 2.5 seconds
    const timer = setTimeout(() => {
      setShowLoader(false);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  if (loading || showLoader) {
    return <Loader />;
  }

  return user ? <ClockInApp user={user} /> : <Login onLogin={setUser} />;
}

export default App;
