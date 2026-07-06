import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const updateSession = async (request: NextRequest) => {
  // Create an unmodified response
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // refreshing the auth token
  const { data: { user } } = await supabase.auth.getUser();

  // Role-based protection rules:
  // If user is logged in, restrict pages based on role:
  // - Students cannot visit `/teacher/*`
  // - Teachers cannot visit `/student/*`
  // - Unauthenticated users are redirected to `/login` if trying to access dashboard
  
  const url = request.nextUrl.clone();
  
  if (!user) {
    // If not logged in and requesting dashboard, redirect to login
    if (url.pathname.startsWith('/teacher') || url.pathname.startsWith('/student') || url.pathname === '/') {
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
  } else {
    // Retrieve user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    if (url.pathname === '/' || url.pathname === '/login') {
      // Redirect home route to respective role dashboards
      if (role === 'teacher') {
        url.pathname = '/teacher';
        return NextResponse.redirect(url);
      } else if (role === 'student') {
        url.pathname = '/student';
        return NextResponse.redirect(url);
      }
    }

    if (url.pathname.startsWith('/teacher') && role !== 'teacher') {
      // Prevent students from visiting teacher dashboard
      url.pathname = '/student';
      return NextResponse.redirect(url);
    }

    if (url.pathname.startsWith('/student') && role !== 'student') {
      // Prevent teachers from visiting student dashboard
      url.pathname = '/teacher';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
};
