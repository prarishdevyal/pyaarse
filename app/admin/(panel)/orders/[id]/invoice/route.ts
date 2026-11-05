import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { getOrderSummary, invoicePdfFor } from "@/lib/orders";
import { invoiceNumber } from "@/lib/invoice";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, id), columns: { status: true } });
  const summary = order && order.status !== "cancelled" ? await getOrderSummary(id) : null;
  if (!order || !summary) notFound();
  const pdf = await invoicePdfFor(summary, order.status !== "pending_payment");
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceNumber(summary.orderNumber)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
