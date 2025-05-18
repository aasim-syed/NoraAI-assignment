// src/components/UploadForm.jsx
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import './UploadInterface.css';

export default function UploadForm({ onStart }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescFile, setJobDescFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    if (!resumeFile || !jobDescFile) {
      setError('Please select both files.');
      return;
    }
    setLoading(true);
    try {
      // 1) Upload to Supabase Storage
      const resumePath = `resumes/${uuidv4()}-${resumeFile.name}`;
      const jobDescPath = `jobdescs/${uuidv4()}-${jobDescFile.name}`;

      const { error: err1 } = await supabase
        .storage
        .from('uploads')
        .upload(resumePath, resumeFile, { cacheControl: '3600', upsert: false });
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .storage
        .from('uploads')
        .upload(jobDescPath, jobDescFile, { cacheControl: '3600', upsert: false });
      if (err2) throw err2;

      // 2) Get public URLs
      const { publicURL: resumeUrl } = supabase
        .storage
        .from('uploads')
        .getPublicUrl(resumePath);

      const { publicURL: jobDescUrl } = supabase
        .storage
        .from('uploads')
        .getPublicUrl(jobDescPath);

      // 3) Call backend to start session
      const res = await fetch(`/api/interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeUrl, jobDescUrl })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to start interview');
      }
      const { sessionId } = await res.json();
      onStart(sessionId);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <form onSubmit={handleSubmit} className="upload-card">
        <h2>Upload Resume & Job Description</h2>
        {error && <div className="error">{error}</div>}

        <div className="form-group">
          <label>Upload Resume (PDF/DOCX)</label>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={e => setResumeFile(e.target.files[0])}
            required
          />
        </div>

        <div className="form-group">
          <label>Upload Job Description (PDF/DOCX)</label>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={e => setJobDescFile(e.target.files[0])}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Starting...' : 'Start Interview'}
        </button>
      </form>
    </div>
  );
}
