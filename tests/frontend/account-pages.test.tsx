import { render, screen } from "@testing-library/react";
import type { Metadata } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDetail, ProjectSummary } from "@/lib/projects/repo";
import { stageSteps } from "@/lib/projects/stages";

// The account pages (/login, /account, /account/projects/[id]) rendered as Next renders them, with the
// session and the data layer mocked: noindex metadata, one h1, headings in order, the redirect to
// /login without a session and the 404 for a project that is not the customer's.

const session = vi.hoisted(() => ({ getSignedInUser: vi.fn() }));
const repo = vi.hoisted(() => ({ listProjectsForUser: vi.fn(), getProjectForUser: vi.fn() }));
vi.mock("@/lib/auth/user-session", () => session);
vi.mock("@/lib/projects/repo", () => repo);
vi.mock("@/lib/browser", () => ({ hardNavigate: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/account",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  redirect: (to: string) => {
    throw new Error(`REDIRECT ${to}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const user = { id: "u1", phone: "9876543210", name: "Asha Verma", createdAt: "2026-10-01T06:00:00.000Z" };
const project: ProjectSummary = {
  id: "3f0c1a2b-1111-4222-8333-444455556666",
  service: "Interior Painting",
  city: "Agra",
  citySlug: "agra",
  locality: "Kamla Nagar",
  stage: "booked",
  stageLabel: "Booking received",
  createdAt: "2026-10-28T06:00:00.000Z",
  updatedAt: "2026-10-28T06:00:00.000Z",
  currency: "INR",
};
const detail: ProjectDetail = {
  ...project,
  address: "12 Rose Villa",
  pincode: "282005",
  stageExplanation: "We call you during working hours to fix the visit.",
  workStartsOn: null,
  stages: stageSteps("booked", [{ stage: "booked", at: project.createdAt }]),
  timeline: [{ stage: "booked", label: "Booking received", note: null, at: project.createdAt }],
  inspection: null,
  quotations: [],
};

beforeEach(() => {
  session.getSignedInUser.mockReset();
  repo.listProjectsForUser.mockReset();
  repo.getProjectForUser.mockReset();
});

function expectOutline(container: HTMLElement, h1: RegExp) {
  const h1s = screen.getAllByRole("heading", { level: 1 });
  expect(h1s).toHaveLength(1);
  expect(h1s[0]).toHaveTextContent(h1);
  const levels = [...container.querySelectorAll("h1, h2, h3, h4")].map((h) => Number(h.tagName[1]));
  expect(levels[0]).toBe(1);
  levels.forEach((level, i) => {
    if (i > 0) expect(level).toBeLessThanOrEqual(levels[i - 1] + 1);
  });
  for (const img of container.querySelectorAll("img")) expect(img).toHaveAttribute("alt");
}

const noindex = (m: Metadata, path: string) => {
  expect(m.robots).toEqual({ index: false, follow: true });
  expect(m.alternates?.canonical).toBe(path);
  expect(`${String(m.title)} | Paint Saathi`.length).toBeLessThanOrEqual(60);
};

describe("/login", () => {
  it("is noindex, with one h1 and the form", async () => {
    const { default: LoginPage, metadata } = await import("@/app/(site)/login/page");
    noindex(metadata, "/login");
    const { container } = render(<LoginPage />);
    expectOutline(container, /Log in to track your project/);
    expect(screen.getByLabelText("Mobile number")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Book a free inspection/ })).toHaveAttribute("href", "/book");
  });
});

describe("/account", () => {
  it("sends a visitor without a session to the login page, coming back here", async () => {
    const { default: AccountPage } = await import("@/app/(site)/account/page");
    session.getSignedInUser.mockResolvedValue(null);
    await expect(AccountPage()).rejects.toThrow("REDIRECT /login?next=%2Faccount");
  });

  it("greets the customer by first name and lists their projects (noindex)", async () => {
    const { default: AccountPage, metadata } = await import("@/app/(site)/account/page");
    noindex(metadata, "/account");
    session.getSignedInUser.mockResolvedValue(user);
    repo.listProjectsForUser.mockResolvedValue([project]);
    const { container } = render(await AccountPage());
    expectOutline(container, /Namaste, Asha/);
    expect(repo.listProjectsForUser).toHaveBeenCalledWith("u1");
    expect(screen.getByRole("link", { name: "Interior Painting" })).toHaveAttribute("href", `/account/projects/${project.id}`);
    expect(screen.getByText("+91 98765 43210")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete my account" })).toBeInTheDocument();
  });

  it("without a name or projects: a welcome, the name field and the booking link", async () => {
    const { default: AccountPage } = await import("@/app/(site)/account/page");
    session.getSignedInUser.mockResolvedValue({ ...user, name: null });
    repo.listProjectsForUser.mockResolvedValue([]);
    const { container } = render(await AccountPage());
    expectOutline(container, /Welcome to your account/);
    expect(screen.getByLabelText(/Your name/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Book a free inspection" })).toHaveAttribute("href", "/book");
  });
});

describe("/account/projects/[id]", () => {
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  it("is noindex at its own path", async () => {
    const { generateMetadata } = await import("@/app/(site)/account/projects/[id]/page");
    noindex(await generateMetadata(params(project.id)), `/account/projects/${project.id}`);
  });

  it("sends a visitor without a session to the login page, coming back to this project", async () => {
    const { default: ProjectPage } = await import("@/app/(site)/account/projects/[id]/page");
    session.getSignedInUser.mockResolvedValue(null);
    await expect(ProjectPage(params(project.id))).rejects.toThrow(`REDIRECT /login?next=%2Faccount%2Fprojects%2F${project.id}`);
  });

  it("someone else's project or an unknown id is the 404", async () => {
    const { default: ProjectPage } = await import("@/app/(site)/account/projects/[id]/page");
    session.getSignedInUser.mockResolvedValue(user);
    repo.getProjectForUser.mockResolvedValue(null);
    await expect(ProjectPage(params("not-mine"))).rejects.toThrow("NOT_FOUND");
    expect(repo.getProjectForUser).toHaveBeenCalledWith("u1", "not-mine");
  });

  it("renders the tracker with the service and place in the h1", async () => {
    const { default: ProjectPage } = await import("@/app/(site)/account/projects/[id]/page");
    session.getSignedInUser.mockResolvedValue(user);
    repo.getProjectForUser.mockResolvedValue(detail);
    const { container } = render(await ProjectPage(params(project.id)));
    expectOutline(container, /Interior Painting in Kamla Nagar/);
    expect(screen.getByText("12 Rose Villa, Kamla Nagar, Agra 282005")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /My account/ })).toHaveAttribute("href", "/account");
    expect(screen.getByRole("heading", { level: 2, name: "Your progress" })).toBeInTheDocument();
  });

  it("a project with no service or place still reads well", async () => {
    const { default: ProjectPage } = await import("@/app/(site)/account/projects/[id]/page");
    session.getSignedInUser.mockResolvedValue(user);
    repo.getProjectForUser.mockResolvedValue({ ...detail, service: null, locality: null, city: null, address: null, pincode: null });
    const { container } = render(await ProjectPage(params(project.id)));
    expectOutline(container, /House painting project/);
  });
});
