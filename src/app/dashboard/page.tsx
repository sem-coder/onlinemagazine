import Link from "next/link";
import { redirect } from "next/navigation";
import { UploadDropzone } from "@/components/UploadDropzone.client";
import { DashboardChrome } from "@/components/DashboardChrome";
import { workspaceUser } from "@/lib/auth";
import { listMagazinesForOwner, usedStorageBytes } from "@/lib/magazines";
import { formatBytes, getPlan } from "@/lib/plans";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const space = await workspaceUser();
  if (!space) redirect("/login?next=/dashboard");
  const magazines = await listMagazinesForOwner(space.owner.id);
  const plan = getPlan(space.owner.plan);
  const used = magazines.length;
  const cap = plan.flipbooks;
  const storageUsed = usedStorageBytes(magazines);

  return (
    <DashboardChrome user={space.user} owner={space.owner} isMember={space.isMember}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Klantomgeving</h1>
          <p className="mt-1 text-ink/60">
            Hoi {space.user.name}. Plan: {plan.name}
            {cap ? ` · ${used}/${cap} flipbooks` : ` · ${used} flipbooks`}
            {` · ${formatBytes(storageUsed)} / ${plan.storageGb} GB`}
          </p>
        </div>
      </div>
      <div className="mt-8 max-w-xl">
        <UploadDropzone compact />
      </div>
      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {magazines.map((magazine) => (
          <li key={magazine.id} className="overflow-hidden rounded-2xl bg-white ring-1 ring-black/5">
            <Link href={`/dashboard/${magazine.id}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/magazines/${magazine.id}/cover`} alt="" className="aspect-[3/4] w-full object-cover" />
              <div className="p-4">
                <p className="font-medium">{magazine.title}</p>
                <p className="text-sm text-ink/55">
                  {magazine.views} weergaven · /v/{magazine.slug}
                  {magazine.leadForm ? " · leadformulier aan" : ""}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {magazines.length === 0 ? (
        <p className="mt-8 text-sm text-ink/55">Nog geen magazines. Upload een PDF om je eerste link te maken.</p>
      ) : null}
    </DashboardChrome>
  );
}
