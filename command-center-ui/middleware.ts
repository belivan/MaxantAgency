import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protected page routes (require authentication)
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/projects(.*)',
  '/prospecting(.*)',
  '/analysis(.*)',
  '/leads(.*)',
  '/outreach(.*)',
  '/analytics(.*)',
]);

// Public API routes (no authentication required)
// These are internal Next.js API routes that proxy to backend services
const isPublicApiRoute = createRouteMatcher([
  '/api/analysis/prompts(.*)',
  '/api/leads(.*)',
  '/api/projects(.*)',
  '/api/benchmarks(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  // Allow public API routes without authentication
  if (isPublicApiRoute(req)) {
    return;
  }

  // Protect all other routes
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};