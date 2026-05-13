import { ComingSoon } from "@/components/ComingSoon";

export default function NewsPage() {
  return (
    <ComingSoon
      title="News & Research"
      description="Aggregated market news, analyst ratings, and research reports."
      features={[
        "Real-time market news from multiple sources",
        "Analyst upgrades & downgrades tracker",
        "Earnings calendar with EPS estimates",
        "IPO calendar & SPAC tracker",
        "SEC filings & insider trading monitor",
        "Sentiment analysis on news headlines",
        "Personalized news feed based on watchlist",
      ]}
    />
  );
}
