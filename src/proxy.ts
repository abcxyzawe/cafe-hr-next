import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "cafe-hr-session";
const ALG = "HS256";

const PUBLIC_PATHS = [
  "/login",
  "/kiosk",
  "/feedback",
  "/api/health",
  "/api/openapi.json",
  "/api/employees/template.csv",
  "/api/shifts/template.csv",
  "/api/kiosk/stream",
];
const PUBLIC_PREFIXES = ["/_next", "/brand", "/assets", "/avatars", "/manifest.webmanifest", "/favicon"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
}

async function isAuthed(req: NextRequest): Promise<boolean> {
  const tok = req.cookies.get(COOKIE)?.value;
  if (!tok) return false;
  const secret = process.env.AUTH_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(tok, new TextEncoder().encode(secret), {
      algorithms: [ALG],
    });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    // If already logged in, bounce away from /login
    if (pathname === "/login" && (await isAuthed(req))) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (await isAuthed(req)) return NextResponse.next();

  // For API calls (XHR / fetch / EventSource), return 401 JSON instead of redirect
  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const url = new URL("/login", req.url);
  if (pathname !== "/") {
    url.searchParams.set("next", pathname + req.nextUrl.search);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
