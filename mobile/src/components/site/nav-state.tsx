import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// What the bottom nav needs from the home page: which of its sections is in view (the website's nav
// follows the section on the home page) and a way to glide to one when its tab is tapped.

type ScrollToSection = (id: string) => void;

type NavState = {
  homeSection: number;
  setHomeSection: (index: number) => void;
  scrollHome?: ScrollToSection;
  setScrollHome: (fn: ScrollToSection | undefined) => void;
};

const Ctx = createContext<NavState>({ homeSection: 0, setHomeSection: () => undefined, setScrollHome: () => undefined });

export function NavStateProvider({ children }: { children: ReactNode }) {
  const [homeSection, setHomeSection] = useState(0);
  const [scrollHome, setScrollHomeState] = useState<ScrollToSection>();
  const value = useMemo<NavState>(
    () => ({ homeSection, setHomeSection, scrollHome, setScrollHome: (fn) => setScrollHomeState(() => fn) }),
    [homeSection, scrollHome],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useNavState = () => useContext(Ctx);
