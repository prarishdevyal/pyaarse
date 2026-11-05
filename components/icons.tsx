import { Heart, type LucideProps } from "lucide-react";

// Icons come from Lucide (lucide.dev). Re-exported under app names so pages stay readable.
export {
  ArrowRight as ArrowRightIcon,
  AtSign as AtSignIcon,
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
