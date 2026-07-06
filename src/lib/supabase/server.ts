import { createServerClient } from '@supabase/ssr';
import type { WebSocketLikeConstructor } from '@supabase/realtime-js';
import { cookies } from 'next/headers';
import WebSocket from 'ws';
import type { Database } from '@/lib/database.types';

export const createClient = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: Parameters<typeof cookieStore.set>[2];
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if proxy is refreshing
            // user sessions.
          }
        },
      },
      realtime: {
        transport: WebSocket as unknown as WebSocketLikeConstructor,
      },
    }
  );
};
