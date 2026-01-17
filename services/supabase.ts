
import { createClient } from '@supabase/supabase-js';

// Configuration for Supabase
const SUPABASE_URL = 'https://fgksmafyrcloyikaqgpr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZna3NtYWZ5cmNsb3lpa2FxZ3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1NTU2MzksImV4cCI6MjA4NDEzMTYzOX0.rFqrohHiVLwiqWCfwe3e21wvwoC5UumII-KphyhbMNA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to check if supabase is configured
export const isSupabaseConfigured = () => {
    return SUPABASE_URL.includes('supabase.co') && SUPABASE_KEY.length > 20;
};
