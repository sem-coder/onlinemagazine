import { NextResponse } from "next/server";
import { applySessionCookie, getGuestId, loginUser, registerUser } from "@/lib/auth";
import { claimGuestMagazines } from "@/lib/magazines";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    password?: string;
    name?: string;
    mode?: "login" | "signup";
  };
  try {
    const guestId = await getGuestId();
    const user =
      body.mode === "signup"
        ? await registerUser({
            email: body.email ?? "",
            password: body.password ?? "",
            name: body.name ?? "",
          })
        : await loginUser(body.email ?? "", body.password ?? "");
    if (guestId) await claimGuestMagazines(guestId, user.id);
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
    });
    return applySessionCookie(response, user.id);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Inloggen mislukt" },
      { status: 400 },
    );
  }
}
