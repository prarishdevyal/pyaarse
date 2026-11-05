import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getOrderSummary, invoicePdfFor } from "@/lib/orders";
import { invoiceNumber } from "@/lib/invoice";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const summary = await getOrderSummary(id);
  if (!summary) notFound();
  const pdf = await invoicePdfFor(summary);
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoiceNumber(summary.orderNumber)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
