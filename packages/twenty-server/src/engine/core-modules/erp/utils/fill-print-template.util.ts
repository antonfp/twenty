// Shared by the print services (sales-invoice «Счёт», sales-shipment УПД):
// both fill a static HTML template with header values and expand one
// repeating `<!-- BEGIN line -->...<!-- END line -->` block per document
// line. Every value comes from workspace data (item/party names, etc.) and
// may itself contain a literal "{{word}}" substring — substitution must
// never treat that as an unfilled placeholder.
const PLACEHOLDER_PATTERN = /\{\{(\w+)\}\}/g;

export const escapeHtml = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

// Blank requisites must render as empty strings, never as 'undefined'. A
// single regex pass: String.replace never re-scans the text a replacer
// returns, so a value containing "{{word}}" survives THIS call untouched —
// the mangling risk only appears when a rendered result is fed back through
// a second, separate fillPlaceholders call (see fillPrintTemplate below).
export const fillPlaceholders = (
  template: string,
  values: Record<string, string>,
): string => {
  return template.replace(PLACEHOLDER_PATTERN, (_match, placeholderName) =>
    escapeHtml(values[placeholderName] ?? ''),
  );
};

// Distinct {{word}} placeholder names appearing anywhere in `template`, in
// first-appearance order. Used to derive a print service's "known"
// placeholder set from its own built-in template (get_print_template's
// placeholder list) and to find which names in a CUSTOM override template
// fall outside that set.
export const getTemplatePlaceholderNames = (template: string): string[] => {
  const names = new Set<string>();

  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) {
    names.add(match[1]);
  }

  return [...names];
};

// Placeholder names present in `template` that are NOT in `knownNames` — a
// workspace override template may reference a placeholder the print service
// doesn't fill (typo or genuinely unsupported). Ruling: not an error, stays
// visible in the rendered output; render_print_preview reports these instead
// of them being silently blanked (see withUnknownPlaceholdersPreserved).
export const findUnknownPlaceholderNames = (
  template: string,
  knownNames: ReadonlySet<string>,
): string[] => {
  return getTemplatePlaceholderNames(template).filter(
    (name) => !knownNames.has(name),
  );
};

// `values` extended so every placeholder in `template` that ISN'T in
// `knownNames` maps to its own literal text ("{{name}}"). Passing the result
// through fillPlaceholders (still one single pass, same as always) leaves
// that placeholder visible in the output instead of erasing it — without
// touching fillPlaceholders' own "unknown key -> ''" contract for its other
// callers (that's for a fixed, fully-known map; see its own tests).
export const withUnknownPlaceholdersPreserved = (
  template: string,
  values: Record<string, string>,
  knownNames: ReadonlySet<string>,
): Record<string, string> => {
  const augmented = { ...values };

  for (const name of findUnknownPlaceholderNames(template, knownNames)) {
    augmented[name] = `{{${name}}}`;
  }

  return augmented;
};

const LINE_BLOCK_PATTERN = /<!-- BEGIN line -->([\s\S]*?)<!-- END line -->/;

// Not a valid {{word}} match and not plausible in a hand-written HTML
// template — safe to splice in and back out around the header-level pass.
const LINE_BLOCK_SENTINEL = '\u0000ERP_PRINT_LINE_BLOCK\u0000';

export const extractLineBlockTemplate = (template: string): string => {
  return template.match(LINE_BLOCK_PATTERN)?.[1] ?? '';
};

// Fills a print template that has one repeating line block plus header
// placeholders. renderedLinesHtml must already be fully rendered (each line
// run once through fillPlaceholders against the line-block template — see
// extractLineBlockTemplate). Order is what makes this safe: the header pass
// runs on the template with the line block swapped for a sentinel, so its
// regex never scans already-rendered line content (which may legitimately
// contain literal "{{...}}" coming from item/party names); the final splice
// is a plain string replace with a function replacer, so it can't be
// re-interpreted as another placeholder or a $-substitution pattern either.
export const fillPrintTemplate = ({
  template,
  headerValues,
  renderedLinesHtml,
}: {
  template: string;
  headerValues: Record<string, string>;
  renderedLinesHtml: string;
}): string => {
  const templateWithSentinel = template.replace(
    LINE_BLOCK_PATTERN,
    LINE_BLOCK_SENTINEL,
  );
  const filledTemplate = fillPlaceholders(templateWithSentinel, headerValues);

  return filledTemplate.replace(LINE_BLOCK_SENTINEL, () => renderedLinesHtml);
};
