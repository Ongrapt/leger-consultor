import { clerkMiddleware } from "@clerk/nextjs/server";

// La protección por ruta vía createRouteMatcher está deprecada en este SDK;
// cada página/ruta ya valida su propia sesión con auth() (ver layout, page.tsx
// bajo (app) y route.ts). Este proxy solo mantiene el handshake de sesión de Clerk.
export default clerkMiddleware();

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
