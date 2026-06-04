'use server';

import { createClient } from '@/lib/supabase/server';
import { LoginSchema, RegisterSchema } from '@/lib/schemas';
import { REGISTRATION_DEADLINE } from '@/lib/config';
import { sendWelcomeEmail } from '@/lib/notifications';
import { redirect } from 'next/navigation';

export async function loginAction(formData: FormData) {
  const raw = {
    email:    formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const parsed = LoginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: 'Email o contraseña incorrectos' };
  }

  redirect('/dashboard');
}

export async function registerAction(formData: FormData) {
  // Check registration deadline
  if (new Date() > REGISTRATION_DEADLINE) {
    return { error: 'El período de registro ha cerrado.' };
  }

  const raw = {
    email:        formData.get('email') as string,
    password:     formData.get('password') as string,
    display_name: formData.get('display_name') as string,
  };

  const parsed = RegisterSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email:    parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.display_name },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: 'Este email ya está registrado.' };
    }
    return { error: error.message };
  }

  await sendWelcomeEmail(parsed.data.email, parsed.data.display_name);
  redirect('/onboarding');
}

export async function signInWithGoogleAction() {
  const supabase = createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.url) {
    redirect(data.url);
  }
}

export async function logoutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
