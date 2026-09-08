import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    // Fail closed: if the password isn't configured, refuse to serve the app
    // rather than silently running unauthenticated in production.
    return new NextResponse("APP_PASSWORD is not configured on the server.", { status: 500 });
  }

  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const decoded = Buffer.from(encoded, "base64").toString("utf-8");
      const [, password] = decoded.split(":");
      if (password === expected) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Cut Tracker"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
