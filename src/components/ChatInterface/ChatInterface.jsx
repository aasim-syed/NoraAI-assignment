// src/components/ChatInterface.jsx
import { useState, useEffect, useRef } from 'react';

export default function ChatInterface({ sessionId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const bottomRef = useRef(null);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch initial question
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
          body: JSON.stringify({ sessionId, answer: input })
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

  const endInterview = () => {
    // You might navigate to a feedback page, or fetch feedback here
    window.location.href = `/feedback?sessionId=${sessionId}`;
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col h-screen p-4">
      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-2 rounded ${
              m.role === 'ai' ? 'bg-gray-100 self-start' : 'bg-blue-100 self-end'
            }`}
          >
            <strong>{m.role === 'ai' ? 'AI' : 'You'}:</strong> {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex items-center space-x-2">
        <input
          type="text"
          className="flex-1 border rounded px-3 py-2"
          placeholder="Type your answer..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendAnswer()}
          disabled={loading}
        />
        <button
          onClick={sendAnswer}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          Send
        </button>
        <button
          onClick={endInterview}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          End
        </button>
      </div>
    </div>
  );
}
