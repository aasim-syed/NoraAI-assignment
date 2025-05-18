// src/App.jsx
import { useState, useEffect } from 'react';
import { supabase } from './lib/supabaseClient';
import Login from './components/Login/Login';  // your custom or Supabase Auth UI
import UploadForm from './components/UploadInterface/UploadInterface';
import ChatInterface from './components/ChatInterface/ChatInterface';

export default function App() {
  // tracks interview flow
  const [sessionId, setSessionId] = useState(null);
  // tracks Supabase auth session
  const [session, setSession] = useState(null);

  useEffect(() => {
    // 1) check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // 2) listen for future auth changes
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 3) if not signed in, show login
  if (!session) {
    return <Login />;
  }

  // 4) once signed in, preserve your existing logic
  return (
    <div className="min-h-screen bg-gray-50">
      {!sessionId ? (
        <UploadForm onStart={setSessionId} />
      ) : (
        <ChatInterface sessionId={sessionId} />
      )}
    </div>
  );
}
