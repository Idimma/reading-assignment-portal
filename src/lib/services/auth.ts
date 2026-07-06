'use server';

import { createClient } from '@/lib/supabase/server';
import { loginSchema, LoginInput } from './schemas';

export async function login(input: LoginInput) {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.errors[0].message);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Fetch role for redirect path
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('User profile record not found.');
  }

  return {
    user: data.user,
    role: profile.role,
  };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return profile;
}
