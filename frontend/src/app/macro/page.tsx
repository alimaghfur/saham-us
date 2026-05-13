import { ComingSoon } from "@/components/ComingSoon";

export default function MacroPage() {
  return (
    <ComingSoon
      title="Macro / Economic"
      description="Track macroeconomic indicators that affect the stock market."
      features={[
        "Federal Reserve interest rate tracker & FOMC calendar",
        "CPI & PPI inflation data with historical charts",
        "GDP growth rate & economic cycle indicator",
        "Unemployment rate & labor market data",
        "US Treasury yield curve (2Y/10Y spread)",
        "Fear & Greed Index visualization",
        "Dollar Index (DXY) correlation analysis",
        "Economic event calendar with market impact",
      ]}
    />
  );
}
