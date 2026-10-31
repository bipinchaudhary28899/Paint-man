// A stand-in for @shopify/react-native-skia under Jest (its own mock needs CanvasKit): each drawing
// component becomes a plain view carrying its props as `skia`, so tests read what would be drawn.
// useImage hands back an image, or null while `skiaImages.loaded` is false.
import { createElement, type ReactNode } from "react";
import { View } from "react-native";

export const skiaImages = { loaded: true };
const image = { width: () => 933, height: () => 1400 };

const host = (name: string) =>
  function SkiaMock({ children, ...props }: { children?: ReactNode }) {
    return createElement(View, { testID: `skia-${name}`, skia: props } as object, children);
  };

export const Canvas = host("canvas");
export const Group = host("group");
export const Image = host("image");
export const BlendColor = host("blend-color");
export const useImage = () => (skiaImages.loaded ? image : null);
