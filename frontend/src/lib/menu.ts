import {
  Activity,
  AlertCircle,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Cpu,
  Eye,
  Filter,
  Gauge,
  Globe,
  Home,
  LineChart,
  Newspaper,
  PieChart,
  Settings,
  Sparkles,
  TestTube,
  TrendingUp,
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
      {
        name: "Dashboard",
        href: "/",
        icon: Home,
        description: "Market snapshot & overview",
      },
      {
        name: "Markets & Sectors",
        href: "/markets",
        icon: Globe,
        description: "Sector rotation & breadth",
      },
      {
        name: "Macro Economy",
        href: "/macro",
        icon: Gauge,
        badge: "Soon",
        description: "Fed rates, GDP, CPI data",
      },
    ],
  },
  {
    label: "Research",
    items: [
      {
        name: "Screener",
        href: "/screener",
        icon: Filter,
        description: "Multi-criteria stock filter",
      },
      {
        name: "News & Research",
        href: "/news",
        icon: Newspaper,
        badge: "Soon",
        description: "News, upgrades & downgrades",
      },
      {
        name: "AI Insights",
        href: "/ai",
        icon: Sparkles,
        badge: "New",
        description: "AI-powered market analysis",
      },
    ],
  },
  {
    label: "Trading",
    items: [
      {
        name: "Swing Trading",
        href: "/swing",
        icon: TrendingUp,
        description: "Breakout & pullback setups",
      },
      {
        name: "Scalping",
        href: "/scalping",
        icon: Zap,
        description: "Momentum & hot stocks",
      },
      {
        name: "Backtesting",
        href: "/backtest",
        icon: TestTube,
        badge: "Soon",
        description: "Strategy simulation",
      },
    ],
  },
  {
    label: "Portfolio",
    items: [
      {
        name: "Watchlist",
        href: "/watchlist",
        icon: Eye,
        description: "Track your picks",
      },
      {
        name: "My Portfolio",
        href: "/portfolio",
        icon: PieChart,
        badge: "Soon",
        description: "Holdings & P&L tracking",
      },
      {
        name: "Alerts",
        href: "/alerts",
        icon: Bell,
        badge: "Soon",
        description: "Price & signal alerts",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        name: "Settings",
        href: "/settings",
        icon: Settings,
        description: "App preferences",
      },
    ],
  },
];

export { BarChart3, Activity, LineChart };
