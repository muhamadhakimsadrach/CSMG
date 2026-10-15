import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, ArcElement } from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, ArcElement);
const font = { family: "Inter, sans-serif", size: 10 };
const tooltip = { backgroundColor: "#183953", titleFont: { ...font, size: 11 }, bodyFont: font, padding: 12, cornerRadius: 7, boxPadding: 5 };

export function WaterTrendChart({ labels, registrations, connections }) {
  return <Line role="img" aria-label="Grafik tren pendaftaran dan sambungan aktif" data={{ labels, datasets: [
    { label: "Pendaftaran baru", data: registrations, borderColor: "#1485C5", borderWidth: 2.5, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 5, pointBackgroundColor: "#1485C5", pointBorderColor: "white", pointBorderWidth: 2,
      backgroundColor: (context) => { const area = context.chart.chartArea; if (!area) return "rgba(20,133,197,0.08)"; const gradient = context.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom); gradient.addColorStop(0, "rgba(20,133,197,0.12)"); gradient.addColorStop(1, "rgba(20,133,197,0.005)"); return gradient; } },
    { label: "Sambungan aktif", data: connections, borderColor: "#39B8A9", borderWidth: 2, borderDash: [5, 4], backgroundColor: "transparent", tension: 0.4, pointRadius: 0, pointHoverRadius: 4, pointBackgroundColor: "#39B8A9" },
  ] }} options={{ responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false }, animation: { duration: 1000, easing: "easeOutQuart" }, plugins: { legend: { display: false }, tooltip }, scales: {
    x: { border: { display: false }, grid: { display: false }, ticks: { color: "#96A2B2", font, maxTicksLimit: 8, maxRotation: 0, padding: 10 } },
    y: { beginAtZero: true, suggestedMax: 10, border: { display: false, dash: [3, 4] }, grid: { color: "#EDF1F6", tickLength: 0 }, ticks: { color: "#96A2B2", font, precision: 0, maxTicksLimit: 5, padding: 12 } },
  } }} />;
}

export function WaterStatusChart({ items, total }) {
  return <div className="relative mx-auto h-[150px] w-[150px]"><Doughnut role="img" aria-label="Distribusi status pendaftaran" data={{ labels: items.map((item) => item.label), datasets: [{ data: total ? items.map((item) => item.count) : [1], backgroundColor: total ? items.map((item) => item.color) : ["#edf2f7"], borderColor: "#ffffff", borderWidth: 4, borderRadius: 3, hoverOffset: 3 }] }} options={{ cutout: "79%", responsive: true, maintainAspectRatio: false, animation: { duration: 1200, animateRotate: true }, plugins: { legend: { display: false }, tooltip: { ...tooltip, enabled: Boolean(total) } } }} /><div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-[30px] font-semibold leading-tight tracking-[-1px] text-[#263e59]">{total}</span><span className="mt-1 text-[10px] text-slate-400">Total pendaftaran</span></div></div>;
}
