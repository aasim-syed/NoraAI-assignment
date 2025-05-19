import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { FiUploadCloud } from 'react-icons/fi'; // Install if not done
import './UploadInterface.css';

export default function UploadForm({ onStart }) {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescFile, setJobDescFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDrop = (e, setter) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && /\.(pdf|docx)$/i.test(file.name)) {
      setter(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!resumeFile || !jobDescFile) {
      setError('Please select both files.');
      return;
    }

    setLoading(true);
    try {
      const resumePath = `resumes/${uuidv4()}-${resumeFile.name}`;
      const jobDescPath = `jobdescs/${uuidv4()}-${jobDescFile.name}`;

      const { error: err1 } = await supabase
        .storage
        .from('uploads')
        .upload(resumePath, resumeFile);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .storage
        .from('uploads')
        .upload(jobDescPath, jobDescFile);
      if (err2) throw err2;

      const { publicURL: resumeUrl } = supabase.storage.from('uploads').getPublicUrl(resumePath);
      const { publicURL: jobDescUrl } = supabase.storage.from('uploads').getPublicUrl(jobDescPath);

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
        <h2>Upload Resume & JD</h2>
        {error && <div className="error">{error}</div>}

        {/* Resume */}
        <div
          className="drop-area"
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, setResumeFile)}
        >
          <FiUploadCloud size={40} />
          <p>{resumeFile ? resumeFile.name : 'Drag & drop Resume (PDF/DOCX) or click'}</p>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={e => setResumeFile(e.target.files[0])}
          />
        </div>

        {/* Job Description */}
        <div
          className="drop-area"
          onDragOver={e => e.preventDefault()}
          onDrop={e => handleDrop(e, setJobDescFile)}
        >
          <FiUploadCloud size={40} />
          <p>{jobDescFile ? jobDescFile.name : 'Drag & drop JD (PDF/DOCX) or click'}</p>
          <input
            type="file"
            accept=".pdf,.docx"
            onChange={e => setJobDescFile(e.target.files[0])}
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Starting...' : 'Start Interview'}
        </button>
      </form>
    </div>
  );
}
