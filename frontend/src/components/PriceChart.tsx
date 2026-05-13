"use client";

import { useEffect, useRef } from "react";
import {
  ColorType,
  CrosshairMode,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

import type { OHLCV } from "@/lib/types";

interface Props {
  candles: OHLCV[];
  height?: number;
}

/**
 * TradingView-style candlestick chart. Handles responsive sizing
 * and cleans up on unmount.
 */
export function PriceChart({ candles, height = 400 }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { color: "rgba(148, 163, 184, 0.08)" },
        horzLines: { color: "rgba(148, 163, 184, 0.08)" },
      },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: "rgba(148, 163, 184, 0.15)" },
      timeScale: {
        borderColor: "rgba(148, 163, 184, 0.15)",
        timeVisible: true,
        secondsVisible: false,
      },
      height,
      autoSize: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderUpColor: "#22c55e",
      borderDownColor: "#ef4444",
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "rgba(148, 163, 184, 0.4)",
    });
    chart.priceScale("volume").applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    volumeRef.current = volumeSeries;

    const handleResize = () => chart.applyOptions({});
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    if (!seriesRef.current || !volumeRef.current) return;
    const candleData = candles
      .map((c) => ({
        time: Math.floor(new Date(c.date).getTime() / 1000) as UTCTimestamp,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
      .filter((c) => Number.isFinite(c.time));
    const volumeData = candles.map((c) => ({
      time: Math.floor(new Date(c.date).getTime() / 1000) as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? "rgba(34, 197, 94, 0.35)" : "rgba(239, 68, 68, 0.35)",
    }));
    seriesRef.current.setData(candleData);
    volumeRef.current.setData(volumeData);
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height: `${height}px` }}
    />
  );
}
