import {
  Activity,
  BarChart3,
  Bell,
  BookOpen,
  Calculator,
  Calendar,
  CalendarDays,
  Clock,
  Eye,
  Filter,
  Gauge,
  Globe,
  GraduationCap,
  Home,
  LineChart,
  Newspaper,
  PieChart,
  Repeat,
  Settings,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  TestTube,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserCircle,
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
      { name: "Market Hours", href: "/markets/hours", icon: Clock, badge: "New", description: "Jam trading US vs WIB" },
      { name: "Macro Economy", href: "/macro", icon: Gauge, description: "VIX, Treasury, Fear & Greed" },
      { name: "Weekly Recap", href: "/recap", icon: CalendarDays, badge: "New", description: "Ringkasan pasar mingguan" },
    ],
  },
  {
    label: "Analisa",
    items: [
      { name: "Stock Score", href: "/score", icon: Target, badge: "New", description: "Skor saham 1-100" },
      { name: "Prediksi Saham", href: "/prediction", icon: TrendingUp, badge: "New", description: "Prediksi harga 1d/1w/1m" },
      { name: "ML Prediction", href: "/ml-prediction", icon: Sparkles, badge: "AI", description: "Prediksi Machine Learning" },
      { name: "Sentimen Berita", href: "/sentiment", icon: Newspaper, badge: "New", description: "NLP sentimen dari berita" },
      { name: "Social Buzz", href: "/social-sentiment", icon: Globe, badge: "New", description: "Reddit/Twitter sentiment" },
      { name: "Earnings Predict", href: "/earnings-predict", icon: Calendar, badge: "AI", description: "Prediksi earnings beat/miss" },
      { name: "Insider Trading", href: "/insider-trading", icon: Eye, badge: "Pro", description: "CEO/CFO buy/sell tracker" },
      { name: "Pattern Recognition", href: "/patterns", icon: Activity, badge: "Pro", description: "Auto-detect chart patterns" },
      { name: "Rekomendasi", href: "/recommendations", icon: Star, badge: "New", description: "Top picks hari ini" },
      { name: "Buy the Dip", href: "/opportunities", icon: TrendingDown, description: "Saham bagus lagi diskon" },
      { name: "Screener", href: "/screener", icon: Filter, description: "Filter saham multi-kriteria" },
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
      { name: "Options Chain", href: "/options", icon: BarChart3, badge: "New", description: "Options & Greeks" },
      { name: "Unusual Options", href: "/unusual-options", icon: Zap, badge: "Pro", description: "Deteksi aktivitas opsi abnormal" },
      { name: "Dark Pool", href: "/dark-pool", icon: Eye, badge: "Pro", description: "Institutional flow & whale alerts" },
      { name: "Fibonacci", href: "/fibonacci", icon: Activity, badge: "New", description: "Auto Fib retracement" },
      { name: "Monte Carlo", href: "/monte-carlo", icon: TestTube, badge: "New", description: "Simulasi probabilistik" },
      { name: "Position Calculator", href: "/calculator", icon: Calculator, description: "Hitung lot aman" },
      { name: "DCA Planner", href: "/calculator/dca", icon: Repeat, badge: "New", description: "Investasi berkala" },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { name: "Watchlist", href: "/watchlist", icon: Eye, description: "Track + auto-score" },
      { name: "Paper Trading", href: "/paper-trading", icon: Trophy, description: "Latihan $100K virtual" },
      { name: "Portfolio Optimizer", href: "/portfolio-optimizer", icon: PieChart, badge: "Pro", description: "Markowitz efficient frontier" },
      { name: "Copy Trading", href: "/copy-trading", icon: Star, badge: "Pro", description: "Follow top traders" },
      { name: "Portfolio", href: "/portfolio", icon: PieChart, description: "Holdings & P&L" },
      { name: "ETF Screener", href: "/etf-screener", icon: BarChart3, badge: "New", description: "Compare ETFs" },
      { name: "Dividends & DRIP", href: "/dividends", icon: Repeat, badge: "New", description: "Dividen & simulasi reinvest" },
      { name: "Trading Journal", href: "/journal", icon: BookOpen, badge: "New", description: "Catat & review trade" },
      { name: "Alerts", href: "/alerts", icon: Bell, description: "Notifikasi harga" },
      { name: "Risk Dashboard", href: "/risk", icon: ShieldAlert, description: "Cek diversifikasi" },
      { name: "Goal Tracker", href: "/goals", icon: Target, badge: "New", description: "Target investasi" },
    ],
  },
  {
    label: "Belajar",
    items: [
      { name: "Panduan Investasi", href: "/education", icon: GraduationCap, description: "Glossary & strategi" },
      { name: "Economic Calendar", href: "/economic-calendar", icon: Calendar, badge: "New", description: "FOMC, CPI, NFP, GDP" },
      { name: "Market Breadth", href: "/market-breadth", icon: BarChart3, badge: "Pro", description: "A/D Line, McClellan, Breadth" },
    ],
  },
  {
    label: "Settings",
    items: [
      { name: "Akun Saya", href: "/account", icon: UserCircle, description: "Profil & informasi akun" },
      { name: "Settings", href: "/settings", icon: Settings, description: "Preferensi app" },
    ],
  },
];

export { BarChart3, Activity, LineChart };
