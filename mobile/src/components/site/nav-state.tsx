import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

// What the bottom nav needs from the home page: a way to glide back to its top when Home is tapped
// there. (Nothing follows the section in view any more: the active tab is the screen.)

type ScrollToSection = (id: string) => void;

type NavState = {
  scrollHome?: ScrollToSection;
  setScrollHome: (fn: ScrollToSection | undefined) => void;
};

const Ctx = createContext<NavState>({ setScrollHome: () => undefined });

export function NavStateProvider({ children }: { children: ReactNode }) {
  const [scrollHome, setScrollHomeState] = useState<ScrollToSection>();
  const value = useMemo<NavState>(() => ({ scrollHome, setScrollHome: (fn) => setScrollHomeState(() => fn) }), [scrollHome]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useNavState = () => useContext(Ctx);
