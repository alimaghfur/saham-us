import { ComingSoon } from "@/components/ComingSoon";

export default function PortfolioPage() {
  return (
    <ComingSoon
      title="My Portfolio"
      description="Track your holdings, P&L, and portfolio performance vs benchmarks."
      features={[
        "Add transactions (buy/sell) with price & date",
        "Real-time P&L calculation with unrealized gains",
        "Portfolio allocation pie chart by sector & stock",
        "Performance comparison vs S&P 500 benchmark",
        "Dividend income tracking & yield on cost",
        "Export to CSV for tax reporting",
      ]}
    />
  );
}
