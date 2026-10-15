import { useEffect, useRef } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { useBranding } from "@/context/BrandingContext";
import { cn } from "@/utils/cn";

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const FONT = { family: '"Plus Jakarta Sans", system-ui, sans-serif', size: 11 };
const PALETTE = ["#4F46E5", "#0EA5E9", "#14B8A6", "#F59E0B", "#16A34A", "#E11D48", "#6366F1", "#64748B"];

function useChartTheme() {
  const { settings } = useBranding();
  const ref = useRef(settings);
  ref.current = settings;
  return settings?.accent_color || PALETTE[0];
}

const BASE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 650, easing: "easeOutQuart" },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#0F172A",
      titleFont: { ...FONT, size: 12, weight: "600" },
      bodyFont: FONT,
      padding: 10,
      cornerRadius: 8,
      displayColors: true,
      boxPadding: 4,
    },
  },
};

export function DoughnutChart({ labels, data, colors = PALETTE, centerLabel, centerValue, className }) {
  const accent = useChartTheme();
  const datasetColors = labels.map((label, i) => colors[i % colors.length] ?? accent);
  return (
    <div className={cn("relative", className)}>
      <div className="h-[220px]">
        <Doughnut
          data={{
            labels,
            datasets: [
              {
                data,
                backgroundColor: datasetColors,
                borderColor: "#ffffff",
                borderWidth: 3,
                hoverOffset: 8,
                borderRadius: 4,
              },
            ],
          }}
          options={{
            ...BASE_OPTIONS,
            cutout: "68%",
            plugins: {
              ...BASE_OPTIONS.plugins,
              legend: {
                display: true,
                position: "bottom",
                labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: "circle", font: FONT, color: "#64748B", padding: 12 },
              },
            },
          }}
        />
      </div>
      {centerValue !== undefined ? (
        <div className="pointer-events-none absolute inset-x-0 top-[74px] text-center">
          <p className="font-display text-2xl font-semibold tracking-tight text-slate-900">{centerValue}</p>
          <p className="text-[11px] font-medium text-slate-500">{centerLabel}</p>
        </div>
      ) : null}
    </div>
  );
}

export function StackedBarChart({ labels, series, stacked = true, className, height = 260 }) {
  const accent = useChartTheme();
  return (
    <div className={cn("relative", className)}>
      <div style={{ height }} className="px-0.5">
        <Bar
          data={{
            labels,
            datasets: series.map((s, i) => ({
              label: s.label,
              data: s.data,
              backgroundColor: s.color ?? (i === 0 ? accent : PALETTE[(i * 2 + 1) % PALETTE.length]),
              borderRadius: stacked ? 4 : 6,
              borderSkipped: false,
              barThickness: s.thickness ?? undefined,
              maxBarThickness: 26,
            })),
          }}
          options={{
            ...BASE_OPTIONS,
            scales: {
              x: {
                stacked,
                grid: { display: false },
                border: { display: false },
                ticks: { font: FONT, color: "#94A3B8" },
              },
              y: {
                stacked,
                beginAtZero: true,
                grid: { color: "rgba(148,163,184,0.18)" },
                border: { display: false },
                ticks: { font: FONT, color: "#94A3B8", precision: 0, maxTicksLimit: 6 },
              },
            },
            plugins: {
              ...BASE_OPTIONS.plugins,
              legend: {
                display: series.length > 1,
                position: "top",
                align: "end",
                labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: "circle", font: FONT, color: "#64748B", padding: 14 },
              },
            },
          }}
        />
      </div>
    </div>
  );
}

export function LineTrendChart({ labels, series, className, height = 240 }) {
  const accent = useChartTheme();
  return (
    <div className={cn("relative", className)}>
      <div style={{ height}}>
        <Line
          data={{
            labels,
            datasets: series.map((s, i) => {
              const color = s.color ?? (i === 0 ? accent : "#14B8A6");
              return {
                label: s.label,
                data: s.data,
                borderColor: color,
                backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`,
                fill: true,
                tension: 0.38,
                borderWidth: 2.2,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointBackgroundColor: color,
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
              };
            }),
          }}
          options={{
            ...BASE_OPTIONS,
            interaction: { mode: "index", intersect: false },
            scales: {
              x: { grid: { display: false }, border: { display: false }, ticks: { font: FONT, color: "#94A3B8" } },
              y: {
                beginAtZero: true,
                grid: { color: "rgba(148,163,184,0.18)" },
                border: { display: false },
                ticks: { font: FONT, color: "#94A3B8", precision: 0, maxTicksLimit: 5 },
              },
            },
            plugins: {
              ...BASE_OPTIONS.plugins,
              legend: {
                display: true,
                position: "top",
                align: "end",
                labels: { boxWidth: 8, boxHeight: 8, usePointStyle: true, pointStyle: "circle", font: FONT, color: "#64748B", padding: 14 },
              },
            },
          }}
        />
      </div>
    </div>
  );
}

/** Bar horizontal sederhana untuk komposisi prioritas tiket. */
export function PriorityBars({ items, className }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item) => (
        <li key={item.label}>
          <div className="mb-1 flex items-center justify-between text-[12.5px]">
            <span className="font-semibold text-slate-700">{item.label}</span>
            <span className="font-mono text-[12px] text-slate-500">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color ?? "#4F46E5" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Memastikan kanvas di-destroy dengan bersih saat komponen lepas. */
export function useChartCleanup() {
  const ref = useRef(null);
  useEffect(() => () => ref.current?.destroy?.(), []);
  return ref;
}

export { PALETTE };
