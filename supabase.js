import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://woxxncqletulvekostfp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndveHhuY3FsZXR1bHZla29zdGZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNzYzODYsImV4cCI6MjA3NTc1MjM4Nn0.bSE-Fa1r35ZgtjelD98ETuhguFROgk39KyHfSb0NbWo';

export const supabase = createClient(supabaseUrl, supabaseKey);

