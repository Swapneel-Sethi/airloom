"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";

export interface ChartPoint {
  time: string;
  value: number | null;
}

interface TrendChartProps {
  data: ChartPoint[];
  label: string;
  unit: string;
  height?: number;
  guideline?: number;
  guidelineLabel?: string;
  tone?: "light" | "dark";
  nowIndex?: number;
}

const PAD = { left: 46, right: 14, top: 18, bottom: 28 };

export function TrendChart({
  data,
  label,
  unit,
  height = 220,
  guideline,
  guidelineLabel,
  tone = "dark",
  nowIndex,
}: TrendChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(next));
    });
    observer.observe(element);
    setWidth(Math.round(element.getBoundingClientRect().width));
    return () => observer.disconnect();
  }, []);

  const values = useMemo(
    () => data.map((point) => point.value).filter((value): value is number => value !== null),
    [data],
  );

  const maxValue = useMemo(() => {
    const peak = Math.max(...values, guideline ?? 0, 1);
    return Math.ceil((peak * 1.12) / 10) * 10;
  }, [values, guideline]);

  const colors =
    tone === "dark"
      ? {
          line: "#f4f3f0",
          grid: "#242424",
          text: "#8f8f8b",
          dot: "#141414",
          marker: "#00d084",
        }
      : {
          line: "#0a0a0a",
          grid: "#e7e6e2",
          text: "#7a7a78",
          dot: "#ffffff",
          marker: "#0a0a0a",
        };

  const innerWidth = Math.max(0, width - PAD.left - PAD.right);
  const innerHeight = Math.max(0, height - PAD.top - PAD.bottom);
  const usable = data
    .map((point, index) => ({ ...point, index }))
    .filter((point): point is ChartPoint & { index: number; value: number } => point.value !== null);

  const xFor = (position: number) =>
    PAD.left + (usable.length <= 1 ? innerWidth / 2 : (position / (usable.length - 1)) * innerWidth);
  const yFor = (value: number) =>
    PAD.top + innerHeight - (Math.min(value, maxValue) / maxValue) * innerHeight;

  const path = usable
    .map((point, position) => `${position === 0 ? "M" : "L"}${xFor(position).toFixed(1)},${yFor(point.value).toFixed(1)}`)
    .join(" ");

  const tickIndexes = useMemo(() => {
    if (usable.length === 0) return [];
    const count = Math.min(5, usable.length);
    return Array.from({ length: count }, (_, index) =>
      Math.round((index / Math.max(1, count - 1)) * (usable.length - 1)),
    );
  }, [usable.length]);

  const summary = useMemo(() => {
    if (values.length === 0) return `${label} has no data.`;
    const low = Math.min(...values);
    const high = Math.max(...values);
    return `${label}. Lowest ${formatNumber(low, 0)}, highest ${formatNumber(high, 0)} ${unit}.`;
  }, [values, label, unit]);

  const hoverPoint = hover !== null ? usable[hover] : null;

  function handlePointer(event: React.PointerEvent<SVGSVGElement>) {
    if (usable.length === 0 || innerWidth <= 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left - PAD.left;
    const ratio = Math.min(1, Math.max(0, x / innerWidth));
    const position = Math.round(ratio * (usable.length - 1));
    setHover(position);
  }

  const tooltipLeft = hoverPoint
    ? Math.min(Math.max(xFor(hover ?? 0) - 52, 8), Math.max(8, width - 124))
    : 0;

  return (
    <div className="w-full">
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height }}
        role="img"
        aria-label={summary}
      >
        {width > 0 && usable.length > 0 ? (
          <svg
            width={width}
            height={height}
            className="overflow-visible"
            onPointerMove={handlePointer}
            onPointerLeave={() => setHover(null)}
          >
            {[0, 0.5, 1].map((fraction) => {
              const y = PAD.top + innerHeight * fraction;
              const value = Math.round(maxValue * (1 - fraction));
              return (
                <g key={fraction}>
                  <line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y}
                    y2={y}
                    stroke={colors.grid}
                    strokeWidth={1}
                  />
                  <text
                    x={PAD.left - 10}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize={10}
                    fill={colors.text}
                    className="tnum"
                  >
                    {formatNumber(value, 0)}
                  </text>
                </g>
              );
            })}

            {guideline !== undefined && guideline <= maxValue ? (
              <g>
                <line
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={yFor(guideline)}
                  y2={yFor(guideline)}
                  stroke={colors.text}
                  strokeWidth={1}
                  strokeDasharray="3 4"
                  opacity={0.7}
                />
                <text
                  x={width - PAD.right}
                  y={yFor(guideline) - 7}
                  textAnchor="end"
                  fontSize={10}
                  fill={colors.text}
                >
                  {guidelineLabel ?? `Guideline ${guideline}`}
                </text>
              </g>
            ) : null}

            <path d={path} fill="none" stroke={colors.line} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />

            {usable.map((point, position) =>
              position % 6 === 0 ? (
                <circle
                  key={`${point.time}-${position}`}
                  cx={xFor(position)}
                  cy={yFor(point.value)}
                  r={2.4}
                  fill={colors.dot}
                  stroke={colors.line}
                  strokeWidth={1.2}
                />
              ) : null,
            )}

            {nowIndex !== undefined && nowIndex >= 0 && nowIndex < usable.length ? (
              <g>
                <line
                  x1={xFor(nowIndex)}
                  x2={xFor(nowIndex)}
                  y1={PAD.top - 4}
                  y2={PAD.top + innerHeight}
                  stroke={colors.marker}
                  strokeWidth={1}
                  strokeDasharray="2 3"
                  opacity={0.8}
                />
                <circle cx={xFor(nowIndex)} cy={yFor(usable[nowIndex].value)} r={3.2} fill={colors.marker} />
              </g>
            ) : null}

            {hoverPoint ? (
              <g>
                <line
                  x1={xFor(hover ?? 0)}
                  x2={xFor(hover ?? 0)}
                  y1={PAD.top}
                  y2={PAD.top + innerHeight}
                  stroke={colors.text}
                  strokeWidth={1}
                  opacity={0.6}
                />
                <circle
                  cx={xFor(hover ?? 0)}
                  cy={yFor(hoverPoint.value)}
                  r={4}
                  fill={colors.dot}
                  stroke={colors.line}
                  strokeWidth={1.6}
                />
              </g>
            ) : null}

            {tickIndexes.map((position) => {
              const point = usable[position];
              if (!point) return null;
              return (
                <text
                  key={`tick-${position}`}
                  x={xFor(position)}
                  y={height - 8}
                  textAnchor={position === 0 ? "start" : position === usable.length - 1 ? "end" : "middle"}
                  fontSize={10}
                  fill={colors.text}
                  className="tnum"
                >
                  {point.time.slice(11, 16)}
                </text>
              );
            })}
          </svg>
        ) : (
          <div
            className="flex h-full items-center justify-center rounded-xl border border-dashed text-xs"
            style={{ borderColor: colors.grid, color: colors.text }}
          >
            Chart data is unavailable for this view
          </div>
        )}

        {hoverPoint ? (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-lg bg-white px-2.5 py-1.5 text-[11px] text-ink shadow-sm"
            style={{ left: tooltipLeft }}
          >
            <span className="tnum text-muted">{hoverPoint.time.slice(11, 16)}</span>
            <span className="tnum ml-2">{formatNumber(hoverPoint.value, 0)}</span>
            <span className="ml-1 text-muted">{unit}</span>
          </div>
        ) : null}
      </div>
      <p className="sr-only">{summary}</p>
    </div>
  );
}
