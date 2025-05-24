import { useState, useEffect, useRef } from 'react';
import "./Chatinterface.css";

export default function ChatInterface({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showThanks, setShowThanks] = useState(false); // ✅ new state
  const bottomRef = useRef(null);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const fetchFirst = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/interview/question?sessionId=${sessionId}`
        );
        const data = await res.json();
        setMessages([data]);
      } catch (err) {
        console.error(err);
      }
    };
    fetchFirst();
  }, [sessionId]);

  const sendAnswer = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(msgs => [...msgs, userMsg]);
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/interview/question`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, answer: input }),
        }
      );
      const aiMsg = await res.json();
      setMessages(msgs => [...msgs, aiMsg]);
      setInput('');
    } catch (err) {
      console.error(err);
      setMessages(msgs => [...msgs, { role: 'ai', content: 'Sorry, something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  const endInterview = async () => {
    // ✅ (1) Show thank you message
    setShowThanks(true);

    // ✅ (2) Optional: Send confirmation email to user
    try {
      await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }), // or email if known
      });
    } catch (err) {
      console.error('Failed to send confirmation email:', err);
    }
  };

  // ✅ Show "Thank You" screen instead of chat
  if (showThanks) {
    return (
      <div className="chat-container" style={{ textAlign: 'center', paddingTop: '20vh' }}>
        <h2>✅ Thank you for taking the interview!</h2>
        <p>We’ll get back to you shortly via email.</p>
      </div>
    );
  }

  return (
    <div className={`chat-container ${darkMode ? 'dark' : 'light'}`}>
    <div className="theme-toggle">
        <button onClick={() => setDarkMode(!darkMode)}>
          {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
        </button>
      </div>

      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role === 'ai' ? 'ai' : 'user'}`}>
            <div className="chat-meta">{m.role === 'ai' ? 'AI' : 'You'}</div>
            <div className="chat-text">{m.content}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>


      <div className="chat-controls">
        <input
          type="text"
          placeholder="Type your answer and press Enter..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendAnswer()}
          disabled={loading}
        />
        <button onClick={sendAnswer} disabled={loading}>Send</button>
        <button className="end-btn" onClick={endInterview}>End</button>
      </div>
    </div>
  );
}
