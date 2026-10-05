import React from "react";

export const DEFAULT_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600&auto=format&fit=crop&q=60";

export const getImgSrc = (src?: string) => {
  if (!src) return DEFAULT_PRODUCT_IMAGE;
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) return src;
  if (src.startsWith("/")) return src;
  return `/${src}`;
};

export const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = e.target as HTMLImageElement;
  target.onerror = null;
  target.src = DEFAULT_PRODUCT_IMAGE;
};
