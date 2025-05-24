import { useState, useEffect, useRef } from 'react';
import "./Chatinterface.css";

export default function ChatInterface({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

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

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.lang = 'en-US';
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => setIsListening(true);
    recognitionRef.current.onend = () => setIsListening(false);
    recognitionRef.current.onerror = (e) => {
      console.error('Speech recognition error:', e);
      setIsListening(false);
    };
    recognitionRef.current.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognitionRef.current.start();
  };

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
    setShowThanks(true);
    try {
      await fetch('/api/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } catch (err) {
      console.error('Failed to send confirmation email:', err);
    }
  };

  if (showThanks) {
    return (
      <div className="chat-container" style={{ textAlign: 'center', paddingTop: '20vh' }}>
        <h2>✅ Thank you for taking the interview!</h2>
        <p>We’ll get back to you shortly via email.</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
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
          placeholder="Type or use mic..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button onClick={startListening} disabled={isListening || loading}>
          🎤 {isListening ? 'Listening...' : 'Start Mic'}
        </button>
        <button onClick={sendAnswer} disabled={loading || !input.trim()}>Send</button>
        <button className="end-btn" onClick={endInterview}>End</button>
      </div>
    </div>
  );
}
