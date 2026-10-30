import { apiGet, ApiError, apiPath, NETWORK_MESSAGE } from "~/lib/api";
import { apiBase, DEFAULT_API_BASE, webUrl } from "~/lib/config";

const json = (body: unknown, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;
const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

describe("apiBase / webUrl", () => {
  it("defaults to the live site and trims a trailing slash from an override", () => {
    expect(apiBase(undefined)).toBe(DEFAULT_API_BASE);
    expect(apiBase("  ")).toBe(DEFAULT_API_BASE);
    expect(apiBase("http://localhost:3000/")).toBe("http://localhost:3000");
  });

  it("builds website links with one slash", () => {
    expect(webUrl("/book")).toBe(`${apiBase()}/book`);
    expect(webUrl("privacy-policy")).toBe(`${apiBase()}/privacy-policy`);
  });
});

describe("apiPath", () => {
  it("leaves out empty and missing parameters", () => {
    expect(apiPath("/api/v1/colours/paint", { q: "8386", brand: undefined, family: "", page: 1, sort: null })).toBe("/api/v1/colours/paint?q=8386&page=1");
    expect(apiPath("/api/v1/colours/brands")).toBe("/api/v1/colours/brands");
  });
});

describe("apiGet", () => {
  it("returns the envelope of a successful call", async () => {
    const body = { apiVersion: "v1", kind: "paint-brand", label: "4 paint brands", data: [], meta: { generatedAt: "2026-10-31T00:00:00.000Z" } };
    fetchMock.mockResolvedValue(json(body));
    await expect(apiGet("/api/v1/colours/brands")).resolves.toEqual(body);
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase()}/api/v1/colours/brands`, expect.objectContaining({ headers: { Accept: "application/json" } }));
  });

  it("throws the API's own error code, message and details", async () => {
    fetchMock.mockResolvedValue(
      json({ apiVersion: "v1", kind: "error", label: "Unknown brand", error: { code: "invalid_brand", message: 'Unknown brand "x".', details: ["berger"] } }, 400),
    );
    const err = await apiGet("/api/v1/colours/paint", { brand: "x" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ code: "invalid_brand", message: 'Unknown brand "x".', status: 400, details: ["berger"] });
  });

  it("reports a failed connection as a network error", async () => {
    fetchMock.mockRejectedValue(new TypeError("Network request failed"));
    await expect(apiGet("/api/v1/colours/brands")).rejects.toMatchObject({ code: "network", message: NETWORK_MESSAGE });
  });

  it("passes an abort through untouched", async () => {
    const abort = Object.assign(new Error("Aborted"), { name: "AbortError" });
    fetchMock.mockRejectedValue(abort);
    await expect(apiGet("/api/v1/colours/brands")).rejects.toBe(abort);
  });

  it("rejects a response that is not the envelope", async () => {
    fetchMock.mockResolvedValue(json([1, 2, 3]));
    await expect(apiGet("/x")).rejects.toMatchObject({ code: "bad_response", status: 200 });
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => Promise.reject(new SyntaxError("not json")) } as unknown as Response);
    await expect(apiGet("/x")).rejects.toMatchObject({ code: "bad_response", status: 502 });
  });
});
