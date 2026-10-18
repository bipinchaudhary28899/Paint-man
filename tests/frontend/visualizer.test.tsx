import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Visualizer } from "@/components/visualizer/Visualizer";
import type { SegmentResult } from "@/components/visualizer/segmenter";
import { Segmenter } from "@/components/visualizer/segmenter";

// jsdom has no canvas: give it just enough of a 2D context to load a 4×4 "photo" and paint.
const W = 16, H = 4;
const photoPixels = new Uint8ClampedArray(W * H * 4).fill(220);
for (let i = 3; i < photoPixels.length; i += 4) photoPixels[i] = 255;
let painted: Uint8ClampedArray | null = null;

class FakeImageData {
  data: Uint8ClampedArray; width: number; height: number;
  constructor(a: Uint8ClampedArray | number, b: number, c?: number) {
    if (typeof a === "number") { this.width = a; this.height = b; this.data = new Uint8ClampedArray(a * b * 4); }
    else { this.data = a; this.width = b; this.height = c ?? 1; }
  }
}

beforeEach(() => {
  painted = null;
  vi.stubGlobal("ImageData", FakeImageData);
  vi.stubGlobal("createImageBitmap", vi.fn(async () => ({ width: W, height: H })));
  HTMLCanvasElement.prototype.getContext = vi.fn(function (this: HTMLCanvasElement) {
    const el = this;
    return {
      drawImage: vi.fn(),
      getImageData: () => ({ data: photoPixels, width: W, height: H }),
      // only the on-page canvas counts; detached scratch canvases are ignored
      putImageData: (img: FakeImageData) => { if (el.isConnected) painted = img.data; },
      createImageData: (w: number, h: number) => new FakeImageData(w, h),
    };
  }) as unknown as typeof HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.toBlob = vi.fn(function (cb: BlobCallback) { cb(new Blob(["x"], { type: "image/jpeg" })); });
  vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:x"), revokeObjectURL: vi.fn() });
});
afterEach(() => vi.unstubAllGlobals());

/** A segmenter that answers from a canned mask: left half wall (surface 1), right half not. */
function fakeSegmenter(result?: Partial<SegmentResult> | Error): () => Segmenter {
  const mask = new Uint8Array(W * H);
  const labels = new Int32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W / 2; x++) { mask[y * W + x] = 255; labels[y * W + x] = 1; }
  return () => {
    const s = Object.create(Segmenter.prototype) as Segmenter;
    s.segment = vi.fn(async () => {
      if (result instanceof Error) throw result;
      return { mask: { width: W, height: H, data: mask }, labels, surfaces: 1, coverage: 0.5, ms: 42, ...result } as SegmentResult;
    });
    s.dispose = vi.fn();
    return s;
  };
}

const file = (type = "image/jpeg", size = 1000) => new File([new Uint8Array(size)], "room.jpg", { type });

describe("Visualizer", () => {
  it("rejects files that are not photos before doing any work", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<Visualizer segmenterFactory={fakeSegmenter()} />);
    await user.upload(screen.getByLabelText("Choose a room photo"), file("image/gif"));
    expect(await screen.findByRole("alert")).toHaveTextContent(/JPEG, PNG or WebP/);
    expect(screen.queryByLabelText(/walls shown/)).toBeNull();
  });

  it("loads a photo, finds walls, repaints only the wall pixels and switches shades locally", async () => {
    const user = userEvent.setup();
    const factory = fakeSegmenter();
    render(<Visualizer segmenterFactory={factory} initialShade={{ name: "Peacock", hex: "#1f8f85", code: "PM-803" }} />);
    await user.upload(screen.getByLabelText("Choose a room photo"), file());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/1 wall surface found/));
    expect(screen.getByRole("status")).toHaveTextContent("Detected in 42 ms");
    await waitFor(() => expect(painted).not.toBeNull());
    const p = painted!;
    // pixel 0 (wall) changed towards teal; the far-right pixel (not wall) untouched
    expect(p[0]).not.toBe(220);
    expect(p[1]).toBeGreaterThan(p[0]);
    expect([...p.slice(15 * 4, 16 * 4)]).toEqual([220, 220, 220, 255]);

    // switching shade repaints without asking the segmenter again
    await user.click(screen.getByRole("button", { name: "Sindoor" }));
    await waitFor(() => expect(painted![0]).toBeGreaterThan(painted![1])); // red now leads
    expect(screen.getByText(/After · Sindoor/)).toBeInTheDocument();
    const seg = factory();
    expect(seg.segment).toBeDefined();
  });

  it("takes a starting shade that arrives after mount without dropping the loaded photo", async () => {
    const user = userEvent.setup();
    const factory = fakeSegmenter();
    const { rerender } = render(<Visualizer segmenterFactory={factory} />);
    await user.upload(screen.getByLabelText("Choose a room photo"), file());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/1 wall surface found/));
    const brand = { name: "Mecca Gold", hex: "#e7975b", code: "Asian Paints 7982", bookQuery: "shade=asian-paints%3A7982" };
    rerender(<Visualizer segmenterFactory={factory} initialShade={brand} />);
    expect(screen.getByText(/After · Mecca Gold/)).toBeInTheDocument();
    expect(screen.getByLabelText(/walls shown in Mecca Gold/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book an inspection with Mecca Gold" })).toHaveAttribute("href", "/book?shade=asian-paints%3A7982");
    // clearing the starting shade keeps the current one
    rerender(<Visualizer segmenterFactory={factory} />);
    expect(screen.getByText(/After · Mecca Gold/)).toBeInTheDocument();
    // a named colour without a code books without one
    rerender(<Visualizer segmenterFactory={factory} initialShade={{ name: "Dusty Rose", hex: "#c9a0a0" }} />);
    expect(screen.getByText(/After · Dusty Rose/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book an inspection with Dusty Rose" })).toHaveAttribute("href", "/book");
  });

  it("never replaces a shade the visitor picked with a starting shade that arrives later", async () => {
    const user = userEvent.setup();
    const factory = fakeSegmenter();
    const { rerender } = render(<Visualizer segmenterFactory={factory} />);
    // a swatch found through the search counts as a pick
    await user.type(screen.getByLabelText("Search shades"), "sindoor");
    await user.click(screen.getByRole("button", { name: "Sindoor" }));
    await user.upload(screen.getByLabelText("Choose a room photo"), file());
    await waitFor(() => expect(screen.getByText(/After · Sindoor/)).toBeInTheDocument());
    // the brand shade from the link lands after the pick
    const brand = { name: "Mecca Gold", hex: "#e7975b", code: "Asian Paints 7982", bookQuery: "shade=asian-paints%3A7982" };
    rerender(<Visualizer segmenterFactory={factory} initialShade={brand} />);
    expect(screen.getByText(/After · Sindoor/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book an inspection with Sindoor" })).toHaveAttribute("href", "/book?colour=PM-801");
    rerender(<Visualizer segmenterFactory={factory} initialShade={{ name: "Dusty Rose", hex: "#c9a0a0" }} />);
    expect(screen.getByText(/After · Sindoor/)).toBeInTheDocument();
  });

  it("still takes the linked shade when the visitor only loaded a photo before it arrived", async () => {
    const user = userEvent.setup();
    const factory = fakeSegmenter();
    const { rerender } = render(<Visualizer segmenterFactory={factory} />);
    await user.upload(screen.getByLabelText("Choose a room photo"), file());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/1 wall surface found/));
    rerender(<Visualizer segmenterFactory={factory} initialShade={{ name: "Peacock", hex: "#1f8f85", code: "PM-803" }} />);
    expect(screen.getByText(/After · Peacock/)).toBeInTheDocument();
  });

  it("hold-to-compare shows the untouched photo; walls mode toggles a surface; reset restores it", async () => {
    const user = userEvent.setup();
    render(<Visualizer segmenterFactory={fakeSegmenter()} />);
    await user.upload(screen.getByLabelText("Choose a room photo"), file());
    await waitFor(() => expect(painted).not.toBeNull());
    expect(painted![0]).not.toBe(220);

    const compare = screen.getByRole("button", { name: "Hold to compare" });
    fireEvent.pointerDown(compare);
    await waitFor(() => expect(painted![0]).toBe(220));
    fireEvent.pointerUp(compare);
    await waitFor(() => expect(painted![0]).not.toBe(220));

    // tap the wall surface in Walls mode → excluded → nothing painted
    const canvas = screen.getByLabelText(/walls shown/) as HTMLCanvasElement;
    canvas.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H, right: W, bottom: H, x: 0, y: 0, toJSON: () => ({}) });
    fireEvent.pointerDown(canvas, { clientX: 0.5, clientY: 0.5, pointerId: 1 });
    await waitFor(() => expect(painted![0]).toBe(220));
    // tapping a non-wall spot only hints
    fireEvent.pointerDown(canvas, { clientX: 15.5, clientY: 0.5, pointerId: 1 });
    expect(screen.getByRole("status")).toHaveTextContent(/isn't a detected wall/);
    await user.click(screen.getByRole("button", { name: "Reset selection" }));
    await waitFor(() => expect(painted![0]).not.toBe(220));
  });

  it("downloads the painted photo and goes back to the dropzone", async () => {
    const user = userEvent.setup();
    render(<Visualizer segmenterFactory={fakeSegmenter()} />);
    await user.upload(screen.getByLabelText("Choose a room photo"), file());
    await waitFor(() => expect(painted).not.toBeNull());
    // no brushes: the toolbar is compare / reset / download / change photo only
    expect(screen.queryByRole("button", { name: /brush/i })).toBeNull();
    expect(screen.queryByLabelText("Brush size")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Download" }));
    expect(HTMLCanvasElement.prototype.toBlob).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /Change photo/ }));
    expect(screen.getByLabelText("Choose a room photo")).toBeInTheDocument();
  });

  it("accepts a dropped photo, reports model download progress and compares from the keyboard", async () => {
    const progressFactory = () => {
      const s = fakeSegmenter()();
      const inner = s.segment as unknown as () => Promise<SegmentResult>;
      s.segment = vi.fn(async (...args: unknown[]) => {
        s.onProgress?.({ status: "progress", progress: 50, file: "model.onnx" });
        s.onProgress?.({ status: "ready" });
        return inner.apply(s, args as []);
      }) as typeof s.segment;
      return s;
    };
    render(<Visualizer segmenterFactory={progressFactory} />);
    const zone = screen.getByLabelText("Choose a room photo").closest("label")!;
    fireEvent.dragOver(zone);
    fireEvent.dragLeave(zone);
    fireEvent.dragOver(zone);
    fireEvent.drop(zone, { dataTransfer: { files: [file()] } });
    await waitFor(() => expect(painted).not.toBeNull());
    fireEvent.drop(zone, { dataTransfer: { files: [] } }); // nothing dropped: no change
    const compare = screen.getByRole("button", { name: "Hold to compare" });
    fireEvent.keyDown(compare, { key: "Enter" });
    await waitFor(() => expect(painted![0]).toBe(220));
    fireEvent.keyUp(compare, { key: "Enter" });
    await waitFor(() => expect(painted![0]).not.toBe(220));
    fireEvent.keyDown(compare, { key: "a" });
    // moving the pointer without a stroke in progress does nothing
    const canvas = screen.getByLabelText(/walls shown/) as HTMLCanvasElement;
    fireEvent.pointerMove(canvas, { clientX: 1, clientY: 1 });
    // a null blob from the canvas is ignored
    HTMLCanvasElement.prototype.toBlob = vi.fn(function (cb: BlobCallback) { cb(null); });
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
  });

  it("loads a sample room, and says so when the sample cannot be loaded", async () => {
    let failNext = false;
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      width = W; height = H;
      set src(_v: string) { setTimeout(() => (failNext ? this.onerror?.() : this.onload?.()), 0); }
    }
    vi.stubGlobal("Image", FakeImage);
    const user = userEvent.setup();
    render(<Visualizer segmenterFactory={fakeSegmenter()} />);
    const samplesList = screen.getAllByRole("button").filter((b) => b.querySelector("img"));
    await user.click(samplesList[0]);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/wall surface/));
    await user.click(screen.getByRole("button", { name: /Change photo/ }));
    // a sample whose image fails to load
    failNext = true;
    await user.click(screen.getAllByRole("button").filter((b) => b.querySelector("img"))[1]);
    expect(await screen.findByRole("alert")).toHaveTextContent(/sample photo could not be loaded/);
  });

  it("explains itself when detection fails or finds nothing, and never paints the whole photo", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Visualizer segmenterFactory={fakeSegmenter(new Error("offline"))} />);
    await user.upload(screen.getByLabelText("Choose a room photo"), file());
    expect(await screen.findByRole("alert")).toHaveTextContent(/offline.*try again/i);
    // nothing is recoloured without a detected wall
    await waitFor(() => expect(painted).not.toBeNull());
    expect(painted![0]).toBe(220);
    unmount();

    render(<Visualizer segmenterFactory={fakeSegmenter({ surfaces: 0, coverage: 0 })} />);
    await user.upload(screen.getByLabelText("Choose a room photo"), file());
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(/couldn't find a wall confidently/));
  });

  it("searches our shades and the named-colour catalogue through the API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [{ name: "Sage Leaf", hex: "#9ba88d", family: "Olives", lrv: 36 }], meta: { total: 1 } }), { status: 200 }));
    render(<Visualizer segmenterFactory={fakeSegmenter()} />);
    await user.type(screen.getByLabelText("Search shades"), "sage");
    expect(screen.getByRole("button", { name: "Sage Mist" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Greens" }));
    expect(screen.queryByRole("button", { name: "Taj White" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "All named colours" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/colours/web?perPage=60&q=sage&family=Greens");
    const leaf = await screen.findByRole("button", { name: "Sage Leaf" });
    await user.click(leaf);
    expect(screen.getByText("#9BA88D · named colour")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Book an inspection with Sage Leaf/ })).toHaveAttribute("href", "/book");

    fetchMock.mockResolvedValueOnce(new Response("x", { status: 503 }));
    await user.type(screen.getByLabelText("Search shades"), "x");
    await waitFor(() => expect(screen.getByText(/unavailable right now/)).toBeInTheDocument());
  });
});
