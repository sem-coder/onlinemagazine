import { NextResponse } from "next/server";
import { getGuestId, loginUser, registerUser, setSession } from "@/lib/auth";
import { claimGuestMagazines } from "@/lib/magazines";

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
    await setSession(user.id);
    if (guestId) await claimGuestMagazines(guestId, user.id);
    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, plan: user.plan },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Inloggen mislukt" },
      { status: 400 },
    );
  }
}
