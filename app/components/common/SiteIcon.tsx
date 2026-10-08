import {
  Briefcase, Building2, Code, Globe, GraduationCap, Handshake, Heart, Layers, Lightbulb,
  Rocket, ShieldCheck, ShoppingBag, Sprout, Star, Store, Users, type LucideIcon,
} from 'lucide-react';
import type { SiteIconName } from '@/backend/modules/site-content/site-content.types';

const ICONS: Record<SiteIconName, LucideIcon> = {
  Users, Building2, Sprout, GraduationCap, Rocket, Code, Handshake, Globe, Layers, Heart,
  Star, ShieldCheck, Store, Briefcase, Lightbulb, ShoppingBag,
};

/**
 * Icon chosen in the C-panel. Sized by font size (1em), so text-[34px]
 * classes work like they did for react-icons.
 */
export default function SiteIcon({ name, className }: { name: SiteIconName; className?: string }) {
  const Icon = ICONS[name] ?? Briefcase;
  return <Icon size="1em" className={className} aria-hidden="true" />;
}
