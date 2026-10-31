// A stand-in for @shopify/react-native-skia under Jest (its own mock needs CanvasKit): each drawing
// component becomes a plain view carrying its props as `skia`, so tests can read what would be drawn.
// useImage hands back a 1200 × 800 image, or null while `skiaImages.loaded` is false.
import { createElement, type ReactNode } from "react";
import { View } from "react-native";

export const skiaImages = { loaded: true };
const image = { width: () => 1200, height: () => 800 };

const host = (name: string) =>
  function SkiaMock({ children, testID, ...props }: { children?: ReactNode; testID?: string }) {
    return createElement(View, { testID: testID ?? `skia-${name}`, skia: props } as object, children);
  };

export const Canvas = host("canvas");
export const Group = host("group");
export const Image = host("image");
export const Path = host("path");
export const BlendColor = host("blend-color");
export const useImage = () => (skiaImages.loaded ? image : null);
