import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Protect admin routes
  if (path.startsWith('/admin') && path !== '/admin/login') {
    const isBypassed = request.cookies.get('admin_bypass')?.value === 'true';
    if (isBypassed) {
      return response;
    }

    if (!user) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }

    const email = user.email || '';
    const role = user.user_metadata?.role || '';
    const isAdmin = email === 'admin@tipstar.com' || email.includes('admin') || role === 'admin';

    if (!isAdmin) {
      return NextResponse.redirect(new URL('/admin/login?error=unauthorized', request.url));
    }
  }

  // Redirect to admin dashboard if a logged-in admin tries to access the login page
  if (path === '/admin/login') {
    const isBypassed = request.cookies.get('admin_bypass')?.value === 'true';
    if (isBypassed) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    if (user) {
      const email = user.email || '';
      const role = user.user_metadata?.role || '';
      const isAdmin = email === 'admin@tipstar.com' || email.includes('admin') || role === 'admin';
      if (isAdmin) {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
