import { useCallback, useEffect, useMemo, useState } from "react";

/** Router berbasis hash - ringan, tanpa dependensi, dan aman untuk single-file build. */
function parseHash(hash) {
  const clean = String(hash || "").replace(/^#/, "") || "/dashboard";
  const [pathPart, queryPart] = clean.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  const query = {};
  new URLSearchParams(queryPart || "").forEach((value, key) => {
    query[key] = value;
  });
  return { path: `/${segments.join("/")}`, segments, query };
}

export function useRoute() {
  const [state, setState] = useState(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setState(parseHash(window.location.hash));
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("hashchange", onChange);
    if (!window.location.hash) window.location.replace("#/dashboard");
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const navigate = useCallback((to, options = {}) => {
    const target = String(to).startsWith("/") ? to : `/${to}`;
    if (options.query && Object.keys(options.query).length) {
      const params = new URLSearchParams(options.query).toString();
      window.location.hash = `${target}?${params}`;
    } else {
      window.location.hash = target;
    }
  }, []);

  return useMemo(() => ({ ...state, navigate }), [state, navigate]);
}

export function navigate(to, query) {
  const target = String(to).startsWith("/") ? to : `/${to}`;
  window.location.hash = query ? `${target}?${new URLSearchParams(query).toString()}` : target;
}
