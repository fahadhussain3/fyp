import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://vijizoadoxsijlvfrxek.supabase.co";
// Paste your actual Supabase Anon/Public Key below:
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpaml6b2Fkb3hzaWpsdmZyeGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1NjQ3MzgsImV4cCI6MjEwMzE0MDczOH0.zhakKWWEqiPACjtN02d4-Z8Ls1DhJF1pQIWQlxewvCk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


    