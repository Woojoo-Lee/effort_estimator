import { useEffect, useState } from "react";
import { DEFAULT_ROUTE, isKnownRoute } from "./routes";

function readRouteFromHash() {
  const rawHash = window.location.hash.replace(/^#/, "");
  const path = rawHash.startsWith("/") ? rawHash : DEFAULT_ROUTE;

  return isKnownRoute(path) ? path : DEFAULT_ROUTE;
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => readRouteFromHash());

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = DEFAULT_ROUTE;
      return;
    }

    const handleHashChange = () => {
      setRoute(readRouteFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return route;
}
