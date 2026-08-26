import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

/**
 * HTTP-only session-cookie management.
 *
 * POST  → exchange a Firebase ID token for a session cookie and set it.
 * DELETE → clear the session cookie (logout).
 *
 * This enables server-side route guarding in middleware.ts for private panels
 * (super / institute), closing the client-side-only gating gap.
 */
const SESSION_COOKIE = "__session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export async function POST(req: NextRequest) {
  let idToken: string;
  try {
    const body = (await req.json()) as { idToken?: string };
    idToken = (body.idToken ?? "").trim();
    if (!idToken) return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const expiresIn = SESSION_MAX_AGE_SECONDS * 1000;
    const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (err) {
    console.error("[POST /api/session]", err);
    return NextResponse.json({ error: "Failed to create session" }, { status: 401 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
