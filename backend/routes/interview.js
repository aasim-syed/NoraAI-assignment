import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// read from env
const MOCK_MODE = process.env.MOCK_MODE === 'true';
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/interview/start
// Creates a new session and returns { sessionId }
router.post('/start', async (req, res) => {
  try {
    const { resumeUrl, jobDescUrl } = req.body;
    const userId = uuidv4();

    const { data: session, error } = await supabase
      .from('interview_sessions')
      .insert({
        user_id:      userId,
        resume_url:   resumeUrl,
        job_desc_url: jobDescUrl
      })
      .select('id')
      .single();
    if (error) throw error;

    res.json({ sessionId: session.id });

  } catch (err) {
    console.error('❌ /start error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/interview/question?sessionId=...
// Returns { role:'ai', content:'...' }
router.get('/question', async (req, res) => {
  const { sessionId } = req.query;

  // mock fallback
  if (MOCK_MODE) {
    const mockQ = 'Tell me about a project you built end-to-end—what stack did you use?';
    await supabase
      .from('messages')
      .insert({ session_id: sessionId, role: 'ai', content: mockQ });
    return res.json({ role: 'ai', content: mockQ });
  }

  // real OpenAI call
  try {
    const chat = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are an interview coach.' },
        { role: 'system', content: 'Generate the first interview question based on the resume & job description.' }
      ]
    });
    const question = chat.choices[0].message.content;

    await supabase
      .from('messages')
      .insert({ session_id: sessionId, role: 'ai', content: question });

    res.json({ role: 'ai', content: question });

  } catch (err) {
    console.error('❌ /question GET error:', err);
    // fallback to mock question
    const mockQ = 'Tell me about a project you built end-to-end—what stack did you use?';
    await supabase
      .from('messages')
      .insert({ session_id: sessionId, role: 'ai', content: mockQ });
    res.json({ role: 'ai', content: mockQ });
  }
});

// POST /api/interview/question
// Body: { sessionId, answer }
// Returns next AI question
router.post('/question', async (req, res) => {
  const { sessionId, answer } = req.body;

  try {
    // save the user's answer
    await supabase
      .from('messages')
      .insert({ session_id: sessionId, role: 'user', content: answer });

    // mock fallback
    if (MOCK_MODE) {
      const mockFollowUp = 'Why did you choose that particular architecture?';
      await supabase
        .from('messages')
        .insert({ session_id: sessionId, role: 'ai', content: mockFollowUp });
      return res.json({ role: 'ai', content: mockFollowUp });
    }

    // fetch full transcript
    const { data: history } = await supabase
      .from('messages')
      .select('role,content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    // ask OpenAI for the next question
    const messages = [
      { role: 'system', content: 'You are an interview coach.' },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'system', content: 'Based on the above, ask the next best question.' }
    ];

    const chat = await openai.chat.completions.create({
      model: 'gpt-4',
      messages
    });
    const nextQ = chat.choices[0].message.content;

    // save & return
    await supabase
      .from('messages')
      .insert({ session_id: sessionId, role: 'ai', content: nextQ });
      
    res.json({ role: 'ai', content: nextQ });

  } catch (err) {
    console.error('❌ /question POST error:', err);
    // fallback
    const mockFollowUp = 'Why did you choose that particular architecture?';
    await supabase
      .from('messages')
      .insert({ session_id: sessionId, role: 'ai', content: mockFollowUp });
    res.json({ role: 'ai', content: mockFollowUp });
  }
});

export default router;
