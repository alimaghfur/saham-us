import { ComingSoon } from "@/components/ComingSoon";

export default function AlertsPage() {
  return (
    <ComingSoon
      title="Alerts"
      description="Set up price alerts, technical signal notifications, and earnings reminders."
      features={[
        "Price above/below threshold alerts",
        "RSI overbought/oversold notifications",
        "MACD crossover signals",
        "Volume spike detection alerts",
        "Earnings date reminders",
        "Email & push notification support",
        "Custom alert conditions with multiple criteria",
      ]}
    />
  );
}
