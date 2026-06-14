import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { IpAsset } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: listings } = await supabase
    .from("ip_assets")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  const myListings = (listings ?? []) as IpAsset[];

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your dashboard</h1>
          <p className="text-sm text-neutral-500">{user.email}</p>
        </div>
        <form action="/auth/signout" method="post">
          <button className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-50">
            Sign out
          </button>
        </form>
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-medium">Your listings</h2>
        {myListings.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-neutral-300 p-10 text-center text-neutral-500">
            You haven&apos;t listed any IP assets yet.
            <br />
            <span className="text-sm">
              Listing creation arrives in the next slice.
            </span>
          </div>
        ) : (
          <ul className="mt-4 space-y-2">
            {myListings.map((l) => (
              <li
                key={l.id}
                className="rounded-md border border-neutral-200 p-4"
              >
                <span className="font-medium">{l.title}</span>{" "}
                <span className="text-sm text-neutral-500">({l.type})</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
