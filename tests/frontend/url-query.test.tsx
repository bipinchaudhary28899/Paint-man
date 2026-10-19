import { act, render, renderHook, screen } from "@testing-library/react";
import { StrictMode, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useUrlQuery } from "@/components/useUrlQuery";

/** Shows the query the hook returns, in an <output> (role "status"). */
function Probe({ once }: { once?: boolean }) {
  const query = useUrlQuery({ once });
  return <output>{query.toString()}</output>;
}

const shown = () => screen.getByRole("status").textContent;
const go = (url: string) => window.history.pushState(null, "", url);

afterEach(() => {
  window.history.replaceState(null, "", "/");
  delete (window as { navigation?: unknown }).navigation;
});

describe("useUrlQuery", () => {
  it("renders an empty query on the server, whatever the address bar says", () => {
    go("/book?service=interior-painting");
    expect(renderToString(<Probe />)).toBe("<output></output>");
  });

  it("reads the address bar once mounted in the browser", () => {
    go("/book?service=interior-painting&colour=PM-502");
    render(<Probe />);
    expect(shown()).toBe("service=interior-painting&colour=PM-502");
  });

  it("hydrates the server HTML in place, with no mismatch, then shows the real query", async () => {
    go("/book?service=exterior-painting");
    const container = document.createElement("div");
    container.innerHTML = renderToString(<Probe />);
    document.body.append(container);
    const output = container.querySelector("output");
    const recoverable = vi.fn();
    const consoleError = vi.spyOn(console, "error");
    const root = await act(async () => hydrateRoot(container, <Probe />, { onRecoverableError: recoverable }));
    expect(container.querySelector("output")).toBe(output); // the same node: hydrated, not replaced
    expect(output).toHaveTextContent("service=exterior-painting");
    expect(recoverable).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    act(() => root.unmount());
    container.remove();
  });

  it("follows back and forward (popstate)", () => {
    go("/book?colour=PM-502");
    render(<Probe />);
    act(() => {
      go("/book?palette=calm-bedroom");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(shown()).toBe("palette=calm-bedroom");
  });

  it("follows same-page navigations where the browser reports them (Navigation API)", () => {
    const navigation = new EventTarget();
    Object.defineProperty(window, "navigation", { value: navigation, configurable: true });
    go("/book?service=interior-painting");
    render(<Probe />);
    act(() => {
      go("/book");
      navigation.dispatchEvent(new Event("currententrychange"));
    });
    expect(shown()).toBe("");
  });

  it("returns the same object until the query changes", () => {
    go("/visualizer?colour=PM-502");
    const { result, rerender } = renderHook(() => useUrlQuery());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
    act(() => {
      go("/visualizer?colour=PM-101");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current).not.toBe(first);
    expect(result.current.get("colour")).toBe("PM-101");
  });

  it("with once, keeps the first query and ignores later changes", () => {
    go("/colours?family=Greens");
    render(<Probe once />);
    act(() => {
      go("/colours?family=Blues");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(shown()).toBe("family=Greens");
  });

  it("with once, reads before a component rewrites the URL, even when Strict Mode runs effects twice", () => {
    // like the colour finder, which writes its own (default) filters to the URL after mounting
    function Rewriter() {
      useEffect(() => window.history.replaceState(null, "", "/colours"), []);
      return null;
    }
    go("/colours?family=Greens");
    render(
      <StrictMode>
        <Probe once />
        <Rewriter />
      </StrictMode>,
    );
    expect(window.location.search).toBe("");
    expect(shown()).toBe("family=Greens");
  });
});
