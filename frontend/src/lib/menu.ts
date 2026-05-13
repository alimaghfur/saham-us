import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Eye,
  Filter,
  Gauge,
  Globe,
  GraduationCap,
  Home,
  LineChart,
  Newspaper,
  PieChart,
  Settings,
  Sparkles,
  Star,
  Target,
  TestTube,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

export interface MenuItem {
  name: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  description?: string;
}

export interface MenuSection {
  label: string;
  items: MenuItem[];
}

export const menuSections: MenuSection[] = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", href: "/", icon: Home, description: "Market snapshot & overview" },
      { name: "Markets & Sectors", href: "/markets", icon: Globe, description: "Sector rotation & breadth" },
      { name: "Macro Economy", href: "/macro", icon: Gauge, description: "VIX, Treasury, Fear & Greed" },
    ],
  },
  {
    label: "Analisa",
    items: [
      { name: "Stock Score", href: "/score", icon: Target, badge: "New", description: "Skor saham 1-100" },
      { name: "Rekomendasi", href: "/recommendations", icon: Star, badge: "New", description: "Top picks hari ini" },
      { name: "Screener", href: "/screener", icon: Filter, description: "Filter saham multi-kriteria" },
      { name: "Buy the Dip", href: "/opportunities", icon: TrendingDown, badge: "New", description: "Saham bagus lagi diskon" },
      { name: "Perbandingan", href: "/compare", icon: BarChart3, description: "Compare saham side-by-side" },
      { name: "AI Insights", href: "/ai", icon: Sparkles, badge: "AI", description: "Natural language screener" },
      { name: "News", href: "/news", icon: Newspaper, description: "Berita & riset" },
    ],
  },
  {
    label: "Trading",
    items: [
      { name: "Swing Trading", href: "/swing", icon: TrendingUp, description: "Breakout & pullback setups" },
      { name: "Scalping", href: "/scalping", icon: Zap, description: "Momentum & hot stocks" },
      { name: "Backtesting", href: "/backtest", icon: TestTube, description: "Simulasi strategi" },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { name: "Paper Trading", href: "/paper-trading", icon: Trophy, badge: "New", description: "Latihan $100K virtual" },
      { name: "Watchlist", href: "/watchlist", icon: Eye, description: "Track saham favorit" },
      { name: "Portfolio", href: "/portfolio", icon: PieChart, description: "Holdings & P&L" },
      { name: "Alerts", href: "/alerts", icon: Bell, description: "Notifikasi harga" },
    ],
  },
  {
    label: "Belajar",
    items: [
      { name: "Panduan Investasi", href: "/education", icon: GraduationCap, badge: "New", description: "Glossary & strategi" },
    ],
  },
  {
    label: "Settings",
    items: [
      { name: "Settings", href: "/settings", icon: Settings, description: "Preferensi app" },
    ],
  },
];

export { BarChart3, Activity, LineChart };
