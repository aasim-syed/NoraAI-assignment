import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function test() {
  // try selecting just one row from your first table
  const { data, error } = await supabase
    .from('interview_sessions')
    .select('id')
    .limit(1);

  if (error) {
    console.error('❌ Supabase test failed:', error);
    process.exit(1);
  }
  console.log('✅ Supabase test passed. Sample data:', data);
  process.exit(0);
}

test();
