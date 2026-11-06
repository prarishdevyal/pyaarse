import { Heart, type LucideProps } from "lucide-react";

// Icons come from Lucide (lucide.dev). Re-exported under app names so pages stay readable.
export {
  ArrowRight as ArrowRightIcon,
  ChevronDown as ChevronDownIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Flame as FlameIcon,
  Gift as GiftIcon,
  Leaf as LeafIcon,
  Mail as MailIcon,
  Menu as MenuIcon,
  MessageCircle as MessageCircleIcon,
  Package as BoxIcon,
  Plus as PlusIcon,
  QrCode as QrCodeIcon,
  Search as SearchIcon,
  ShoppingBag as BagIcon,
  Sparkles as SparkleIcon,
  Trash2 as TrashIcon,
  Truck as TruckIcon,
  UserRound as UserIcon,
  X as CloseIcon,
} from "lucide-react";

export function HeartIcon({ filled, ...props }: LucideProps & { filled?: boolean }) {
  return <Heart {...props} fill={filled ? "currentColor" : "none"} />;
}

/** Instagram glyph drawn in the same thin-line style (Lucide no longer ships brand logos). */
export function InstagramIcon({ size = 24, ...props }: LucideProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.25" />
      <circle cx="17.4" cy="6.6" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}
