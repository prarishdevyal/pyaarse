import { requireAdmin } from "@/lib/auth";
import { listUsersWithStats } from "@/lib/users";
import { formatDate, formatINR } from "@/lib/format";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { changeUserRole } from "../../actions";
import { InviteAdminForm } from "./invite-form";

export const metadata = { title: "Users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireAdmin();
  const [users, { ok, error }] = await Promise.all([listUsersWithStats(), searchParams]);
  const admins = users.filter((u) => u.role === "admin").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl text-brand">Users</h1>
          <p className="mt-1 text-sm text-taupe">{users.length} accounts · {admins} {admins === 1 ? "admin" : "admins"}</p>
        </div>
      </div>

      {ok && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900" role="status">{ok}</p>}
      {error && <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">{error}</p>}

      <section className="card bg-white p-5">
        <h2 className="font-serif text-2xl">Invite an admin</h2>
        <p className="mt-1 text-sm text-taupe">They get an email to choose a password. If they already have a shop account, it becomes an admin.</p>
        <InviteAdminForm />
      </section>

      <div className="card overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-sand/60 text-left text-taupe">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Joined</th>
              <th className="px-4 py-3 text-right font-medium">Orders</th>
              <th className="px-4 py-3 text-right font-medium">Spent</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-sand/40">
            {users.map((u) => (
              <tr key={u.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.name || "—"}</p>
                  {u.id === me.id && <p className="text-xs text-taupe">You</p>}
                </td>
                <td className="px-4 py-3">
                  <p>{u.email}</p>
                  {u.phone && <p className="text-taupe">{u.phone}</p>}
                  {!u.confirmed && <p className="text-xs text-amber-800">{u.role === "admin" ? "Invite not accepted yet" : "Email not confirmed"}</p>}
                </td>
                <td className="whitespace-nowrap px-4 py-3">{formatDate(u.joined)}</td>
                <td className="px-4 py-3 text-right">{u.orders}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">{u.spent ? formatINR(u.spent) : "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${u.role === "admin" ? "bg-blush text-brand" : "bg-stone-100 text-stone-700"}`}>
                    {u.role === "admin" ? "Admin" : "Customer"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {u.id !== me.id && (
                    <form action={changeUserRole}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="role" value={u.role === "admin" ? "customer" : "admin"} />
                      <ConfirmSubmit
                        label={u.role === "admin" ? "Remove admin" : "Make admin"}
                        confirmLabel={u.role === "admin" ? "Yes, remove admin" : "Yes, make admin"}
                      />
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-taupe">Role changes take effect the next time that person logs in, or within an hour.</p>
    </div>
  );
}
