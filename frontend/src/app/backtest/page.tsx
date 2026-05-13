import { ComingSoon } from "@/components/ComingSoon";

export default function BacktestPage() {
  return (
    <ComingSoon
      title="Backtesting"
      description="Simulate your trading strategies against historical data to measure performance."
      features={[
        "Define buy/sell rules with technical indicators",
        "Test on any stock or ETF with up to 20 years of data",
        "Performance metrics: Win rate, Profit Factor, Sharpe Ratio",
        "Drawdown analysis & risk-adjusted returns",
        "Compare strategy vs Buy & Hold benchmark",
        "Visualize trades on interactive price chart",
        "Position sizing & risk management simulation",
        "Export detailed trade log & equity curve",
      ]}
    />
  );
}
