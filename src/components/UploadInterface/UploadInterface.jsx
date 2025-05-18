// src/components/UploadForm.jsx
import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';

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
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-4 space-y-4">
      {error && <div className="text-red-600">{error}</div>}
      <div>
        <label className="block mb-1 font-medium">Upload Resume (PDF/DOCX)</label>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={e => setResumeFile(e.target.files[0])}
          className="block w-full"
          required
        />
      </div>
      <div>
        <label className="block mb-1 font-medium">Upload Job Description (PDF/DOCX)</label>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={e => setJobDescFile(e.target.files[0])}
          className="block w-full"
          required
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Starting...' : 'Start Interview'}
      </button>
    </form>
  );
}
