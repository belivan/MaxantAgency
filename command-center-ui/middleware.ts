import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Protected routes (require authentication)
// This includes both page routes AND API routes
const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/projects(.*)',
  '/prospecting(.*)',
  '/analysis(.*)',
  '/leads(.*)',
  '/outreach(.*)',
  '/analytics(.*)',
  '/api(.*)',  // Protect ALL API routes
]);

export default clerkMiddleware(async (auth, req) => {
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