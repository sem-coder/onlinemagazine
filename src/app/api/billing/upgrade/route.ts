import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { PLANS, type Plan } from "@/lib/plans";
import { saveUser, uniqueBookshelfSlug } from "@/lib/users";
import type { PlanId } from "@/lib/types";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Log in om te upgraden." }, { status: 401 });
  }
  const body = (await request.json()) as { plan?: PlanId; interval?: "monthly" | "yearly" };
  const plan = PLANS.find((item: Plan) => item.id === body.plan);
  if (!plan || plan.id === "free") {
    return NextResponse.json({ error: "Kies een betaald plan." }, { status: 400 });
  }

  user.plan = plan.id;
  const days = body.interval === "yearly" ? 365 : 30;
  user.planRenewsAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  if (!user.bookshelfSlug) {
    user.bookshelfSlug = await uniqueBookshelfSlug(user.name || user.email, user.id);
  }
  await saveUser(user);

  return NextResponse.json({
    user: { id: user.id, plan: user.plan, planRenewsAt: user.planRenewsAt },
    amount: body.interval === "yearly" ? plan.yearly : plan.monthly,
  });
}
