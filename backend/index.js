import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import interviewRoutes from './routes/interview.js';
import feedbackRoutes from './routes/feedback.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Mount our routes
app.use('/api/interview', interviewRoutes);
app.use('/api/feedback', feedbackRoutes);

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`🚀 Backend listening on http://localhost:${port}`);
});
