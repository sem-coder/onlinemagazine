import { redirect } from "next/navigation";

type Params = { params: Promise<{ id: string }> };

export default async function LegacyMagazineRedirect({ params }: Params) {
  const { id } = await params;
  redirect(`/v/${id}`);
}
