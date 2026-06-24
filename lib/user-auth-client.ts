'use client';

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Supabase is not configured for authentication.');
  }

  return createSupabaseClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export function getSupabaseBrowserClient() {
  if (!browserClient) browserClient = createBrowserClient();
  return browserClient;
}

function authRequired() {
  return process.env.NEXT_PUBLIC_REQUIRE_PUBLIC_USER_AUTH !== 'false';
}

export async function getUserAuthHeaders(): Promise<Record<string, string>> {
  if (!authRequired()) return {};

  const supabase = getSupabaseBrowserClient();
  let session = (await supabase.auth.getSession()).data.session;

  if (!session) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.session) {
      throw new Error('Unable to authenticate this device for submitting picks.');
    }
    session = data.session;
  }

  return { Authorization: 'Bearer ' + session.access_token };
}
