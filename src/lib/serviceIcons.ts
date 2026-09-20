// Curated lucide-react icon registry for the /services/[slug] "Comment ça
// marche" (fonctionnement) feature list. Icons are chosen per-feature based
// on the text's meaning (see src/data/services.ts's featureIcons arrays) so
// each bullet is visually recognisable at a glance, not just a checkmark.
//
// Only icons in this registry may be referenced from featureIcons — keeps
// the visual vocabulary bounded and consistent across all 9 pages instead
// of an unbounded free-for-all import surface.
import {
  Palette, Layers, PenTool, Sparkles, Layout, Image as ImageIcon,
  Smartphone, Monitor, Tablet, Globe, Search, Code, Database, Server,
  ShieldCheck, Lock, KeyRound, Zap, RefreshCw, Wrench, Settings, Cloud,
  Bell, Clock, Calendar, CalendarCheck, Phone, PhoneCall, Mic, MessageSquare,
  Mail, MapPin, Users, Users2, UserCheck, Target, TrendingUp, BarChart3,
  PieChart, LineChart, Megaphone, Share2, FileText, FileCheck2, CheckCircle2,
  ShoppingCart, Package, PackageCheck, Truck, Star, Award, BadgeCheck,
  ThumbsUp, Handshake, Eye, Filter, List, Link2, GitBranch, Repeat, Sliders,
  Compass, Lightbulb, Puzzle, Building2, Store, BookOpen, Headphones, Video,
  Camera, Music, Play, Volume2, Gauge, Timer, Fingerprint, Cpu, Bot,
  Workflow, Route, Navigation, Boxes, ClipboardCheck, Rocket, Wifi,
  type LucideIcon,
} from 'lucide-react';

export const FEATURE_ICONS: Record<string, LucideIcon> = {
  Palette, Layers, PenTool, Sparkles, Layout, ImageIcon,
  Smartphone, Monitor, Tablet, Globe, Search, Code, Database, Server,
  ShieldCheck, Lock, KeyRound, Zap, RefreshCw, Wrench, Settings, Cloud,
  Bell, Clock, Calendar, CalendarCheck, Phone, PhoneCall, Mic, MessageSquare,
  Mail, MapPin, Users, Users2, UserCheck, Target, TrendingUp, BarChart3,
  PieChart, LineChart, Megaphone, Share2, FileText, FileCheck2, CheckCircle2,
  ShoppingCart, Package, PackageCheck, Truck, Star, Award, BadgeCheck,
  ThumbsUp, Handshake, Eye, Filter, List, Link2, GitBranch, Repeat, Sliders,
  Compass, Lightbulb, Puzzle, Building2, Store, BookOpen, Headphones, Video,
  Camera, Music, Play, Volume2, Gauge, Timer, Fingerprint, Cpu, Bot,
  Workflow, Route, Navigation, Boxes, ClipboardCheck, Rocket, Wifi,
};

export const FEATURE_ICON_NAMES = Object.keys(FEATURE_ICONS);

/** Falls back to CheckCircle2 for an unknown/missing icon name — never crashes rendering. */
export function getFeatureIcon(name: string | undefined): LucideIcon {
  return (name && FEATURE_ICONS[name]) || CheckCircle2;
}
