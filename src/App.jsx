// src/App.jsx
import { useState, useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { supabase } from './lib/supabaseClient';
import Login from './components/Login/Login';
import UploadForm from './components/UploadInterface/UploadInterface';
import ChatInterface from './components/ChatInterface/ChatInterface';
import ResetPassword from './components/ResetPassword/ResetPassword';

// A wrapper that starts the interview and navigates to Chat
function UploadWrapper() {
  const navigate = useNavigate();

  const handleStart = (sessionId) => {
    navigate(`/chat/${sessionId}`);
  };

  return <UploadForm onStart={handleStart} />;
}

// A wrapper to extract sessionId param for Chat
function ChatWrapper() {
  const { sessionId } = useParams();
  const [showFeedback, setShowFeedback] = useState(false);
console.log("showFeedback")
console.log(showFeedback)
  return (
    <>
      <ChatInterface sessionId={sessionId} onFinishInterview={() => setShowFeedback(true)} />
    </>
  );
}

export default function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for login/logout changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <Router>
      <Routes>
        {/* Root path: redirect based on session */}
        <Route
          path="/"
          element={
            session ? <Navigate to="/upload" replace /> : <Navigate to="/login" replace />
          }
        />

        {/* Login route */}
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/upload" replace />}
        />

        {/* Upload route */}
        <Route
          path="/upload"
          element={session ? <UploadWrapper /> : <Navigate to="/login" replace />}
        />

        {/* Chat route */}
        <Route
          path="/chat/:sessionId"
          element={session ? <ChatWrapper /> : <Navigate to="/login" replace />}
        />

        {/* Reset password route (if needed) */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Fallback 404 */}
        <Route path="*" element={<h2 style={{ padding: "2rem", textAlign: "center" }}>404 - Page Not Found</h2>} />
      </Routes>
    </Router>
  );
}
