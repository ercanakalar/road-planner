export const interpolate = (sentence: string, ...args: unknown[]): string => {
  const values = Object.assign(
    {},
    ...args.filter(
      (arg): arg is Record<string, unknown> =>
        typeof arg === 'object' && arg !== null,
    ),
  ) as Record<string, unknown>;

  return sentence.replace(/{{\s*(\w+)\s*}}/g, (whole, name: string) =>
    name in values ? String(values[name]) : whole,
  );
};
