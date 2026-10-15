import { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

/** Mengungkap elemen saat masuk viewport (scroll reveal). */
export function Reveal({ children, delay = 0, className, as: Tag = "div", once = true }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            if (once) observer.unobserve(entry.target);
          } else if (!once) {
            setVisible(false);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [once]);

  return (
    <Tag
      ref={ref}
      className={cn("reveal", visible && "is-visible", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** Angka animasi untuk kartu KPI. */
export function useCountUp(target, { duration = 900, decimals = 0 } = {}) {
  const [value, setValue] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const to = Number(target ?? 0);
    if (Number.isNaN(to)) {
      setValue(0);
      return undefined;
    }
    let raf;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Number((from + (to - from) * eased).toFixed(decimals)));
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(frame.current);
    };
  }, [target, duration, decimals]);

  return value;
}

/** Jam ticking untuk indikator SLA yang benar-benar hidup. */
export function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export default Reveal;
