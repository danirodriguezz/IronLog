import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export const proxy = async (request: NextRequest) => updateSession(request);

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image
     * - favicon.ico, robots.txt, sitemap.xml
     * - image files (svg, png, jpg, jpeg, gif, webp)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
