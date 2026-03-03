import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wwfpxpafepjxzzfcanzi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZnB4cGFmZXBqeHp6ZmNhbnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMDkwMTcsImV4cCI6MjA4Nzc4NTAxN30.M_hFskqjKD7NzllXtvhqI90djRR-xb454WJu2WWEkS8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function signUp() {
  const email = `testuser_new_${Date.now()}@gmail.com`;
  const password = 'Password123!';

  console.log(`Attempting to sign up with email: ${email}`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        restaurant_name: `Restaurant ${Math.random().toString(36).substring(2, 10)}`,
        full_name: 'Restaurant Manager',
        name: 'Restaurant Manager',
        first_name: 'Restaurant',
        last_name: 'Manager',
        avatar_url: '',
        role: 'restaurant',
        slug: `restaurant-${Math.random().toString(36).substring(2, 10)}`,
        phone: '',
        address: ''
      }
    }
  });

  if (error) {
    console.error('Sign up failed:', error);
  } else {
    console.log('Sign up successful! User ID:', data.user?.id);
  }
}

signUp();
