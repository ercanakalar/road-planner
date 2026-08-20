const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

const expand = (hex: string): string =>
  hex.length === 3
    ? hex
        .split('')
        .map((channel) => channel + channel)
        .join('')
    : hex;

export function withAlpha(color: string, alpha: number): string {
  if (!HEX.test(color)) return color;

  const hex = expand(color.slice(1));
  const channels = [0, 2, 4].map((offset) =>
    parseInt(hex.slice(offset, offset + 2), 16),
  );

  return `rgba(${channels.join(', ')}, ${Math.min(1, Math.max(0, alpha))})`;
}
