import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes (NO authentication required)
const isPublicRoute = createRouteMatcher([
  '/api/webhooks(.*)',  // Clerk webhooks must be public
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/',
]);

// Protected routes (require authentication)
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/projects(.*)',
  '/prospecting(.*)',
  '/analysis(.*)',
  '/leads(.*)',
  '/outreach(.*)',
  '/analytics(.*)',
  '/api(.*)',  // All other API routes
]);

export default clerkMiddleware(async (auth, req) => {
  // Skip auth for public routes
  if (isPublicRoute(req)) return;

  // Protect everything else that matches
  if (isProtectedRoute(req)) await auth.protect();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
