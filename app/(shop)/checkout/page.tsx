import { getCurrentUser } from "@/lib/auth";
import { CheckoutForm } from "./checkout-form";
import { getContent } from "@/lib/content";
import { onlinePaymentsEnabled } from "@/lib/payments";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [user, t] = await Promise.all([getCurrentUser(), getContent()]);
  return (
    <div className="container-page py-12">
      <h1 className="heading-section">{t("checkout.title")}</h1>
      <CheckoutForm
        payOnline={onlinePaymentsEnabled()}
        paymentNote={t("checkout.paymentNote")}
        user={user ? { name: user.name, email: user.email, phone: user.phone ?? "" } : null} />
    </div>
  );
}
