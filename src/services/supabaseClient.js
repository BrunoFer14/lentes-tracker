import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zoazsijhggbexeuekhdu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvYXpzaWpoZ2diZXhldWVraGR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3NDg4NDgsImV4cCI6MjA3MDMyNDg0OH0.--dCKxqOwqff1nE28pn7KO-xs_j1u5-0hXQIT9NtsRY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
