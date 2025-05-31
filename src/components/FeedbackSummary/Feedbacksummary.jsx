import { useEffect, useState } from 'react';
import './FeedbackSummary.css'; // import the pure CSS

const FeedbackSummary = ({ sessionId }) => {
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);

    fetch(`http://localhost:4000/api/feedback?sessionId=${sessionId}`)
      .then(res => res.json())
      .then(data => setFeedback(data.feedback))
      .catch(err => {
        console.error('Failed to fetch feedback', err);
        setFeedback('⚠️ Something went wrong while fetching feedback.');
      })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="feedback-card loading">
        <div className="line short" />
        <div className="line" />
        <div className="line" />
        <div className="line half" />
      </div>
    );
  }

  return (
    <div className="feedback-card">
      <div className="feedback-header">
        <span className="checkmark">✅</span>
        <h2>Interview Feedback</h2>
      </div>
      <div className="feedback-body">
        {feedback
          .split('\n')
          .filter(Boolean)
          .map((line, index) => (
            <p key={index} className="feedback-line">
              {line.startsWith('Strengths')
                ? `💪 ${line.replace('Strengths:', '')}`
                : line.startsWith('Areas to improve')
                ? `🧠 ${line.replace('Areas to improve:', '')}`
                : line}
            </p>
          ))}
      </div>
    </div>
  );
};

export default FeedbackSummary;
