export function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (![3, 6].includes(normalized.length)) {
    return null;
  }
  const full = normalized.length === 3 ? normalized.split("").map((ch) => ch + ch).join("") : normalized;
  const num = Number.parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function srgbToLinear(channel: number) {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) {
    return null;
  }
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(foreground: string, background: string) {
  const l1 = luminance(foreground);
  const l2 = luminance(background);
  if (l1 === null || l2 === null) {
    return null;
  }
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

