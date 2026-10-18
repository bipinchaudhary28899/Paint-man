import { vi } from "vitest";

/**
 * Obviously fake contact details for tests, never real business facts. site.ts ships with these
 * fields empty, so without a mock only the "not filled in yet" branches would ever be tested.
 */
export const fakeContact = {
  phone: "+910000000001",
  phoneDisplay: "+91 00000 00001",
  whatsapp: "910000000001",
  email: "hello@example.com",
  street: "1 Test Road",
  postalCode: "000001",
};

type Overrides = Partial<typeof fakeContact>;

/**
 * Loads a module against a copy of src/config/site.ts with these contact details filled in, the
 * way the owner fills them before launch. `load` does the import (a literal path, so the alias
 * resolves); the module registry is reset first so it and everything it imports see the mock.
 */
export async function withFilledSite<T>(overrides: Overrides, load: () => Promise<T>): Promise<T> {
  vi.resetModules();
  vi.doMock("@/config/site", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/config/site")>();
    const { street, postalCode, ...contact } = overrides;
    const address = { ...actual.site.address, ...(street !== undefined && { street }), ...(postalCode !== undefined && { postalCode }) };
    return { ...actual, site: { ...actual.site, ...contact, address } };
  });
  try {
    return await load();
  } finally {
    vi.doUnmock("@/config/site");
    vi.resetModules();
  }
}
