import { cn } from "@/lib/format";

export function Sparkline({
  values,
  className,
  color = "#f4f3f0",
}: {
  values: number[];
  className?: string;
  color?: string;
}) {
  if (values.length < 2) {
    return <div className={cn("h-12 w-full rounded-md bg-white/5", className)} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 300;
      const y = 52 - ((value - min) / range) * 44;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      viewBox="0 0 300 60"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("h-12 w-full", className)}
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.4}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
