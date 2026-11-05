/**
 * Every piece of site text the admin can edit, with its default copy.
 * An empty value in the editor means "use the default".
 */
import { DEFAULT_PRIVACY, DEFAULT_TERMS } from "./legal-defaults";
import { isAllowedImageUrl } from "./images";

export type ContentKind = "line" | "text" | "long";
export type ContentField = { key: string; label: string; kind: ContentKind; default: string; hint?: string };
export type ContentGroup = { id: string; title: string; fields: ContentField[] };

const line = (key: string, label: string, def: string, hint?: string): ContentField => ({ key, label, kind: "line", default: def, hint });
const text = (key: string, label: string, def: string, hint?: string): ContentField => ({ key, label, kind: "text", default: def, hint });
const long = (key: string, label: string, def: string, hint?: string): ContentField => ({ key, label, kind: "long", default: def, hint });

const LEGAL_HINT = "Start a line with ## for a heading and - for a bullet point. Leave a blank line between paragraphs.";

export const CONTENT_GROUPS: ContentGroup[] = [
  {
    id: "header",
    title: "Header & footer",
    fields: [
      line("announcement", "Top bar message", "Free shipping on orders above {threshold}", "{threshold} is replaced with your free-shipping amount."),
      text("footer.tagline", "Footer description", "Handcrafted candles made with love, for warmth, thoughtful gifting and meaningful little moments."),
    ],
  },
  {
    id: "home-hero",
    title: "Home: top banner",
    fields: [
      line("home.hero.eyebrow", "Small line above the headline", "Handcrafted candles"),
      text("home.hero.title", "Headline", "A little love,\nin every light.", "Use a new line to break the headline."),
      text("home.hero.subtitle", "Text under the headline", "Handcrafted candles to make your moments warmer, calmer and more meaningful."),
      line("home.hero.cta", "Button", "Explore the collection"),
    ],
  },
  {
    id: "home-highlights",
    title: "Home: highlights strip",
    fields: [
      line("home.highlight.1.title", "Highlight 1", "Handcrafted"),
      line("home.highlight.1.text", "Highlight 1 detail", "Small batches, made with care"),
      line("home.highlight.2.title", "Highlight 2", "Thoughtful gifting"),
      line("home.highlight.2.text", "Highlight 2 detail", "Gift-ready for every occasion"),
      line("home.highlight.3.title", "Highlight 3", "Premium fragrances"),
      line("home.highlight.3.text", "Highlight 3 detail", "Long-lasting, mood-lifting scents"),
      line("home.highlight.4.title", "Highlight 4", "Secure packaging"),
      line("home.highlight.4.text", "Highlight 4 detail", "Packed safely, ready to give"),
    ],
  },
  {
    id: "home-sections",
    title: "Home: section headings",
    fields: [
      line("home.collections.title", "Collections heading", "Our collections"),
      line("home.collections.subtitle", "Collections text", "Curated ranges for every mood, space and moment."),
      line("home.bestsellers.title", "Bestsellers heading", "Bestsellers"),
      line("home.bestsellers.subtitle", "Bestsellers text", "Candles everyone keeps coming back for."),
    ],
  },
  {
    id: "home-story",
    title: "Home: our story",
    fields: [
      line("home.story.title", "Heading", "Poured by hand, one small batch at a time"),
      text(
        "home.story.text",
        "Text",
        "Every Pyaarse candle starts with a fragrance we love and ends with a jar we would happily keep. We pour, cure and finish each one by hand, so it burns clean and evenly and fills your room without overpowering it.",
      ),
      line("home.story.cta", "Link", "Read our story"),
    ],
  },
  {
    id: "home-steps",
    title: "Home: how ordering works",
    fields: [
      line("home.steps.title", "Heading", "How ordering works"),
      line("home.steps.1.title", "Step 1", "Place your order"),
      text("home.steps.1.text", "Step 1 detail", "Pick your candles and check out. You don't need an account."),
      line("home.steps.2.title", "Step 2", "Pay on WhatsApp"),
      text("home.steps.2.text", "Step 2 detail", "We send a UPI QR code to your WhatsApp. Pay from any UPI app."),
      line("home.steps.3.title", "Step 3", "We pack and ship"),
      text("home.steps.3.text", "Step 3 detail", "Once payment is in, we pack your order with care and share the tracking details."),
    ],
  },
  {
    id: "home-gifting",
    title: "Home: gifting",
    fields: [
      line("home.gifting.title", "Heading", "Gifting, made personal"),
      text("home.gifting.text", "Text", "Hampers for birthdays, weddings and festivals, with a handwritten note. Tell us the occasion and we'll put one together."),
      line("home.gifting.cta", "Button", "Plan a gift with us"),
    ],
  },
  {
    id: "home-reviews",
    title: "Home: customer reviews",
    fields: [
      line("home.reviews.title", "Heading", "Kind words from our customers"),
      text("home.review.1.quote", "Review 1", "", "Only real reviews. The section is hidden until at least one review is filled in."),
      line("home.review.1.name", "Review 1 name", ""),
      text("home.review.2.quote", "Review 2", ""),
      line("home.review.2.name", "Review 2 name", ""),
      text("home.review.3.quote", "Review 3", ""),
      line("home.review.3.name", "Review 3 name", ""),
    ],
  },
  {
    id: "home-faq",
    title: "Home: questions & answers",
    fields: [
      line("home.faq.title", "Heading", "Questions, answered"),
      line("home.faq.1.q", "Question 1", "How do I pay?"),
      text("home.faq.1.a", "Answer 1", "After you place your order, we send a UPI QR code to your WhatsApp number. Scan it with any UPI app to pay."),
      line("home.faq.2.q", "Question 2", "What if I don't pay straight away?"),
      text("home.faq.2.a", "Answer 2", "We hold your candles for 24 hours, so please complete your payment within that time. Unpaid orders are cancelled after that so the stock is free for others."),
      line("home.faq.3.q", "Question 3", "How do I care for my candle?"),
      text("home.faq.3.a", "Answer 3", "On the first burn, let the wax melt to the edges of the jar. Trim the wick to about 5 mm before each use, and never leave a burning candle unattended."),
      line("home.faq.4.q", "Question 4", "Do you make custom or bulk orders?"),
      text("home.faq.4.a", "Answer 4", "Yes, for gifting, weddings and corporate orders. Message us with the quantity and occasion and we'll get back to you."),
      line("home.faq.5.q", "Question 5", ""),
      text("home.faq.5.a", "Answer 5", ""),
      line("home.faq.6.q", "Question 6", ""),
      text("home.faq.6.a", "Answer 6", ""),
    ],
  },
  {
    id: "about",
    title: "About page",
    fields: [
      line("about.title", "Heading", "Made with love."),
      text("about.intro", "Introduction", "Pyaarse comes from pyaar se, “with love”. We are a small handcrafted candle studio built around warmth, thoughtful gifting and meaningful little moments."),
      line("about.point.1.title", "Point 1", "Poured by hand"),
      text("about.point.1.text", "Point 1 detail", "Every candle is hand-poured in small batches, so each one gets the care it deserves."),
      line("about.point.2.title", "Point 2", "Scents that stay"),
      text("about.point.2.text", "Point 2 detail", "We blend long-lasting fragrances that gently fill a room without overpowering it."),
      line("about.point.3.title", "Point 3", "Gift-ready"),
      text("about.point.3.text", "Point 3 detail", "Packed safely and beautifully, ready to be given, or to be a little gift to yourself."),
      line("about.cta", "Button", "Explore the collection"),
    ],
  },
  {
    id: "shop",
    title: "Shop page",
    fields: [
      line("shop.title", "Heading", "Shop All Candles"),
      line("shop.subtitle", "Text under the heading", "Handcrafted candles for every mood and moment."),
      line("shop.all", "“All” filter button", "All"),
      line("shop.search", "Search box placeholder", "Search candles"),
      line("shop.empty", "When nothing matches", "No candles found."),
    ],
  },
  {
    id: "product",
    title: "Product page",
    fields: [
      line("product.about", "Description heading", "About this candle"),
      line("product.chooseOption", "Above the size/scent options", "Choose an option"),
      line("product.inStock", "In stock", "In stock"),
      line("product.lowStock", "Few left", "Only {n} left", "{n} is replaced with how many are left (shown at 5 or fewer)."),
      line("product.outOfStock", "Out of stock", "Out of stock"),
      line("product.addToCart", "Add to cart button", "Add to Cart"),
      line("product.limitReached", "Button when the cart already has the most allowed", "Limit reached in cart"),
      line("product.added", "Message after adding", "Added to your cart."),
      line("product.viewCart", "Link after adding", "View cart →"),
      line("product.comingSoon", "When a product has no options yet", "Coming soon."),
    ],
  },
  {
    id: "cart",
    title: "Cart & wishlist",
    fields: [
      line("cart.title", "Cart heading", "Your Cart"),
      line("cart.empty.title", "Empty cart heading", "Your cart is empty"),
      line("cart.empty.text", "Empty cart text", "Find something warm to light up your day."),
      line("cart.empty.cta", "Empty cart button", "Shop candles"),
      line("cart.summary", "Order summary heading", "Order summary"),
      line("cart.checkout", "Checkout button", "Proceed to checkout"),
      text("cart.paymentNote", "Note under the checkout button", "Payment via UPI QR on WhatsApp after you place your order."),
      line("wishlist.title", "Wishlist heading", "Your Wishlist"),
      line("wishlist.empty", "Empty wishlist text", "Tap the heart on any candle to save it here."),
      line("wishlist.cta", "Empty wishlist button", "Browse candles"),
    ],
  },
  {
    id: "account",
    title: "Account page",
    fields: [
      line("account.orders", "Orders heading", "Your orders"),
      line("account.noOrders", "When there are no orders", "You haven't placed any orders yet."),
    ],
  },
  {
    id: "notfound",
    title: "Page not found",
    fields: [
      line("notFound.title", "Heading", "Not found"),
      line("notFound.text", "Text", "This page has burned out."),
      line("notFound.cta", "Button", "Go home"),
    ],
  },
  {
    id: "contact",
    title: "Contact page",
    fields: [
      line("contact.title", "Heading", "Get in touch"),
      text("contact.intro", "Text", "Questions about an order, custom gifting or bulk orders? We'd love to hear from you."),
    ],
  },
  {
    id: "checkout",
    title: "Checkout & order confirmation",
    fields: [
      line("checkout.title", "Checkout heading", "Checkout"),
      text("checkout.paymentNote", "Payment note at checkout", "After you place your order, we'll send you a UPI payment QR on WhatsApp."),
      line("confirmed.title", "Order confirmation heading", "Thank you for your order!"),
      line("confirmed.next", "“What happens next” heading", "What happens next?"),
      line("confirmed.step1", "Next step 1", "We've emailed you an order confirmation."),
      line("confirmed.step2", "Next step 2", "We'll message you on WhatsApp with a UPI payment QR code."),
      line("confirmed.step3", "Next step 3", "Once payment is received, we'll lovingly pack and ship your candles."),
      line("confirmed.cta", "Button", "Continue shopping"),
    ],
  },
  {
    id: "legal",
    title: "Privacy policy & terms",
    fields: [
      line("legal.updated", "Last updated", "5 November 2026"),
      long("legal.privacy", "Privacy policy", DEFAULT_PRIVACY, LEGAL_HINT),
      long("legal.terms", "Terms & conditions", DEFAULT_TERMS, LEGAL_HINT),
    ],
  },
];

export const CONTENT_FIELDS = new Map(CONTENT_GROUPS.flatMap((g) => g.fields).map((f) => [f.key, f]));

export const MAX_LENGTH: Record<ContentKind, number> = { line: 200, text: 1000, long: 30000 };

export type SiteContent = (key: string) => string;

/** Builds a lookup that returns the admin's override, else the default. */
export function contentLookup(overrides: Record<string, string>): SiteContent {
  return (key) => {
    const v = overrides[key];
    if (v !== undefined && v.trim() !== "") return v;
    return CONTENT_FIELDS.get(key)?.default ?? "";
  };
}

/** Validates an admin edit. Unknown keys are dropped; empty values clear the override. */
export function cleanContentEdits(input: Record<string, unknown>): { set: Record<string, string>; clear: string[]; errors: string[] } {
  const set: Record<string, string> = {};
  const clear: string[] = [];
  const errors: string[] = [];
  for (const [key, raw] of Object.entries(input)) {
    const field = CONTENT_FIELDS.get(key);
    if (!field || typeof raw !== "string") continue;
    const value = raw.replace(/\r\n/g, "\n").trim();
    if (value === "" || value === field.default) {
      clear.push(key);
    } else if (value.length > MAX_LENGTH[field.kind]) {
      errors.push(`${field.label} is too long (max ${MAX_LENGTH[field.kind]} characters).`);
    } else {
      set[key] = field.kind === "line" ? value.replace(/\s+/g, " ") : value;
    }
  }
  return { set, clear, errors };
}

/** Labels the in-browser parts of the shop need (cart, wishlist, add-to-cart). Sent down from the layout. */
export const CLIENT_TEXT_KEYS = CONTENT_GROUPS.filter((g) => g.id === "product" || g.id === "cart").flatMap((g) => g.fields.map((f) => f.key));

/** The home page photo is uploaded in Site text → Home: top banner and stored under this key (not a text field). */
export const HERO_IMAGE_KEY = "home.hero.image";
export const DEFAULT_HERO_IMAGE = "/placeholders/hero.jpg";

/** The uploaded hero photo if it's one of our own images, else the original photo. */
export function heroImageUrl(stored: string | undefined, supabaseUrl: string | undefined): string {
  return stored && isAllowedImageUrl(stored, supabaseUrl) ? stored : DEFAULT_HERO_IMAGE;
}
