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
    const handleHashChange = () => {
      setRoute(readRouteFromHash());
    };

    window.addEventListener("hashchange", handleHashChange);

    if (!window.location.hash) {
      window.location.hash = DEFAULT_ROUTE;
      setRoute(DEFAULT_ROUTE);
    } else {
      handleHashChange();
    }

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  return route;
}
