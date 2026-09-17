/**
 * Fills the `{{name}}` placeholders in a sentence.
 *
 * `nestjs-i18n` formats with `string-format`, whose placeholders are single
 * braces. The app's other half translates with i18next, whose placeholders are
 * double. Rather than keep two conventions in two sets of dictionaries — where
 * the only symptom of getting it wrong is a literal `{{name}}` on somebody's
 * screen — this is installed as the formatter so both are written the same way.
 *
 * A placeholder with no matching argument is left as it is, so a missing value
 * shows up as the name of what is missing rather than as an empty gap.
 */
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
