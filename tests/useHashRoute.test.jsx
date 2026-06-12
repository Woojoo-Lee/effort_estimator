// @vitest-environment jsdom
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_ROUTE } from "../src/app/routes";
import { useHashRoute } from "../src/app/useHashRoute";

function RouteReader() {
  const route = useHashRoute();

  return <div data-testid="route">{route}</div>;
}

function setHash(hash) {
  window.location.hash = hash;
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

describe("useHashRoute", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    window.location.hash = "";
  });

  it("uses the default route and sets the hash when initial hash is empty", async () => {
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");
    window.location.hash = "";

    render(<RouteReader />);

    await waitFor(() => {
      expect(screen.getByTestId("route").textContent).toBe(DEFAULT_ROUTE);
    });
    expect(window.location.hash).toBe(`#${DEFAULT_ROUTE}`);
  });

  it("uses the standard effort meta route when it is the initial hash", () => {
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");
    window.location.hash = "#/standard-effort-meta";

    render(<RouteReader />);

    expect(screen.getByTestId("route").textContent).toBe(
      "/standard-effort-meta"
    );
  });

  it("updates route state on hashchange after starting from no hash", async () => {
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");
    window.location.hash = "";

    render(<RouteReader />);

    await waitFor(() => {
      expect(screen.getByTestId("route").textContent).toBe(DEFAULT_ROUTE);
    });

    setHash("#/standard-effort-meta");

    await waitFor(() => {
      expect(screen.getByTestId("route").textContent).toBe(
        "/standard-effort-meta"
      );
    });
  });

  it("falls back to the default route for unknown hashes", async () => {
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");
    window.location.hash = "#/unknown-route";

    render(<RouteReader />);

    await waitFor(() => {
      expect(screen.getByTestId("route").textContent).toBe(DEFAULT_ROUTE);
    });
  });

  it("removes the hashchange listener on cleanup", () => {
    vi.stubEnv("VITE_FEATURE_STANDARD_EFFORT_META", "true");
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");

    const rendered = render(<RouteReader />);

    const hashListener = addSpy.mock.calls.find(
      ([eventName]) => eventName === "hashchange"
    )?.[1];

    rendered.unmount();

    expect(hashListener).toBeTruthy();
    expect(removeSpy).toHaveBeenCalledWith("hashchange", hashListener);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
