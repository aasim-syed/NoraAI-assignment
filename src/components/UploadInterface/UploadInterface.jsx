import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { FiUploadCloud } from 'react-icons/fi';
import { ImSpinner2 } from 'react-icons/im';
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
      setError('Please select both Resume and Job Description files.');
      return;
    }

    setLoading(true);
    try {
      const resumePath = `resumes/${uuidv4()}-${resumeFile.name}`;
      const jobDescPath = `jobdescs/${uuidv4()}-${jobDescFile.name}`;

      const { error: err1 } = await supabase.storage.from('uploads').upload(resumePath, resumeFile);
      if (err1) throw err1;

      const { error: err2 } = await supabase.storage.from('uploads').upload(jobDescPath, jobDescFile);
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
    <div className="upload-container flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 px-4">
      <form onSubmit={handleSubmit} className="upload-card backdrop-blur-lg p-8 rounded-2xl shadow-xl bg-white/60 w-full max-w-md">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">Upload Resume & Job Description</h2>


        <div className="drop-pair">
        {[['Resume', resumeFile, setResumeFile], ['Job Description', jobDescFile, setJobDescFile]].map(([label, file, setter], idx) => {
          const isPdf = file?.type === 'application/pdf';
          const previewUrl = file ? URL.createObjectURL(file) : null;
      
          return (
            <div key={label} className="drop-wrapper">
              <label className="drop-label">{label}</label>
      
              <div
                className="drop-area"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, setter)}
                onClick={() => document.getElementById(`file-${idx}`).click()}
              >
                {!file && (
                  <>
                    <FiUploadCloud size={36} className="icon" />
                    <p>Drag & drop or <span className="text-link">click</span> to upload</p>
                    <input
                      type="file"
                      id={`file-${idx}`}
                      accept=".pdf,.docx"
                      onChange={(e) => setter(e.target.files[0])}
                      className="hidden"
                    />
                  </>
                )}
      
                {file && (
                  <div className="file-preview">
                    <div className="file-details">
                      <span className="file-icon">📄</span>
                      <span className="file-name">{file.name}</span>
                    </div>
      
                    <div className="preview-controls">
                      {isPdf ? (
                        <a
                          href={previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="preview-button"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                        </a>
                      ) : (
                        <span className="no-preview">.docx preview unavailable</span>
                      )}
      
                      <button
                        type="button"
                        className="remove-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setter(null);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      
      
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded-xl text-white font-semibold transition-all ${
            loading ? 'bg-purple-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <ImSpinner2 className="animate-spin" />
              Starting...
            </span>
          ) : (
            'Start Interview'
          )}
        </button>
        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-2 rounded mb-4 flex items-center gap-2">
            ❌ <span>{error}</span>
          </div>
        )}
      </form>
      
    </div>
  );
}
