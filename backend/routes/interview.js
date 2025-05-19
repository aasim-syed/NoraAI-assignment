import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Read from env
const MOCK_MODE = process.env.MOCK_MODE === 'true';
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai    = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * POST /api/interview/start
 * Creates a new session and returns { sessionId }
 */
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

/**
 * GET /api/interview/question?sessionId=...
 * Returns { role:'ai', content:'...' }
 */
router.get('/question', async (req, res) => {
  const { sessionId } = req.query;

  // MOCK MODE
  if (MOCK_MODE) {
    const { data: aiMessages } = await supabase
      .from('messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    const onlyAIs = aiMessages.filter(m => m.role === 'ai');
    const aiCount = onlyAIs.length;

    const sequence = [
      "👋 Hey there! I'm your AI interviewer for today. Ready to begin?",
      "📄 I had a glance at your resume—looks quite impressive, great job!",
      "🔥 Let's start with something simple: can you walk me through a project you built end-to-end and the tech stack you used?"
    ];

    if (aiCount >= sequence.length) {
      return res.status(204).end(); // No more to say here
    }

    const nextMsg = sequence[aiCount];
    await supabase
      .from('messages')
      .insert({ session_id: sessionId, role: 'ai', content: nextMsg });

    return res.json({ role: 'ai', content: nextMsg });
  }

  // REAL MODE
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
    const mockQ = 'Tell me about a project you built end-to-end—what stack did you use?';
    await supabase
      .from('messages')
      .insert({ session_id: sessionId, role: 'ai', content: mockQ });
    res.json({ role: 'ai', content: mockQ });
  }
});

/**
 * POST /api/interview/question
 * Body: { sessionId, answer }
 * Returns next AI question
 */
router.post('/question', async (req, res) => {
  const { sessionId, answer } = req.body;

  try {
    await supabase
      .from('messages')
      .insert({ session_id: sessionId, role: 'user', content: answer });

    // MOCK MODE
    if (MOCK_MODE) {
      const { data: messages } = await supabase
        .from('messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      const aiMessages = messages.filter(m => m.role === 'ai');
      let nextMessage;

      if (aiMessages.length === 1) {
        nextMessage = "📄 I had a glance at your resume—looks quite impressive, great job!";
      } else if (aiMessages.length === 2) {
        nextMessage = "🔥 Let's start with something simple: can you walk me through a project you built end-to-end and the tech stack you used?";
      } else {
        const mockFollowUps = [
            "Why did you choose that particular architecture?",
            "What were the biggest challenges you faced during that project?",
            "How did you ensure scalability in your application?",
            "Can you describe how you handled errors or exceptions in that system?",
            "What trade-offs did you consider when selecting your tech stack?",
            "If you were to rebuild the same project today, what would you do differently?",
            "How did you handle testing and debugging in that project?",
            "Did you work with a team? How did you collaborate and divide responsibilities?",
            "Was there any performance bottleneck you encountered, and how did you resolve it?",
            "How did you manage state or data flow across your application?"
          ];
          
          const asked = aiMessages.length - 3; // already handled 3 intros
          nextMessage = mockFollowUps[Math.min(asked, mockFollowUps.length - 1)];
          
      }

      await supabase
        .from('messages')
        .insert({ session_id: sessionId, role: 'ai', content: nextMessage });

      return res.json({ role: 'ai', content: nextMessage });
    }

    // REAL MODE
    const { data: history } = await supabase
      .from('messages')
      .select('role,content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

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

    await supabase
      .from('messages')
      .insert({ session_id: sessionId, role: 'ai', content: nextQ });

    res.json({ role: 'ai', content: nextQ });

  } catch (err) {
    console.error('❌ /question POST error:', err);
    const mockFollowUp = 'Why did you choose that particular architecture?';
    await supabase
      .from('messages')
      .insert({ session_id: sessionId, role: 'ai', content: mockFollowUp });
    res.json({ role: 'ai', content: mockFollowUp });
  }
});

export default router;
