import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const router = express.Router();

// read from env
const MOCK_MODE = process.env.MOCK_MODE === 'true';
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// GET /api/feedback?sessionId=...
// Returns { feedback: '...' }
router.get('/', async (req, res) => {
  const { sessionId } = req.query;

  try {
    // pull transcript
    const { data: history } = await supabase
      .from('messages')
      .select('role,content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    // mock fallback
    if (MOCK_MODE) {
      const mockFB = `
Strengths: You communicated clearly and gave strong examples.
Areas to improve: Try adding more metrics and quantifiable results next time.
`;
      await supabase
        .from('feedback')
        .insert({ session_id: sessionId, summary: mockFB });
      return res.json({ feedback: mockFB });
    }

    // build prompt for OpenAI
    const messages = [
      { role: 'system', content: 'You are an expert recruiter. Provide strengths and areas for improvement.' },
      ...history.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.content
      }))
    ];

    // call OpenAI
    const chat = await openai.chat.completions.create({
      model: 'gpt-4',
      messages
    });
    const feedbackText = chat.choices[0].message.content;

    // save & return
    await supabase
      .from('feedback')
      .insert({ session_id: sessionId, summary: feedbackText });
    res.json({ feedback: feedbackText });

  } catch (err) {
    console.error('❌ /feedback error:', err);
    // fallback
    const mockFB = `
Strengths: You communicated clearly and gave strong examples.
Areas to improve: Try adding more metrics and quantifiable results next time.
`;
    await supabase
      .from('feedback')
      .insert({ session_id: sessionId, summary: mockFB });
    res.json({ feedback: mockFB });
  }
});

export default router;
