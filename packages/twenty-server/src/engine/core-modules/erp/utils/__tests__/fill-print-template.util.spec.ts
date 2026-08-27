import {
  extractLineBlockTemplate,
  extractNamedBlockTemplate,
  fillPlaceholders,
  fillPrintTemplate,
  findUnknownPlaceholderNames,
  getTemplatePlaceholderNames,
  spliceNamedBlock,
  withUnknownPlaceholdersPreserved,
} from 'src/engine/core-modules/erp/utils/fill-print-template.util';

const TEMPLATE = [
  '<div>{{header_name}}</div>',
  '<table>',
  '<!-- BEGIN line -->',
  '<tr><td>{{item_name}}</td></tr>',
  '<!-- END line -->',
  '</table>',
].join('\n');

describe('fillPlaceholders', () => {
  it('fills a known placeholder and escapes HTML in the value', () => {
    expect(fillPlaceholders('<p>{{name}}</p>', { name: '<script>' })).toBe(
      '<p>&lt;script&gt;</p>',
    );
  });

  it('renders an unknown placeholder as an empty string, never "undefined"', () => {
    expect(fillPlaceholders('{{missing}}', {})).toBe('');
  });
});

describe('fillPrintTemplate', () => {
  it('fills header placeholders and the pre-rendered line block', () => {
    const lineBlockTemplate = extractLineBlockTemplate(TEMPLATE);
    const renderedLinesHtml = fillPlaceholders(lineBlockTemplate, {
      item_name: 'Кабель HDMI',
    });

    const result = fillPrintTemplate({
      template: TEMPLATE,
      headerValues: { header_name: 'Счёт № 1' },
      renderedLinesHtml,
    });

    expect(result).toContain('<div>Счёт № 1</div>');
    expect(result).toContain('<tr><td>Кабель HDMI</td></tr>');
  });

  // Phase 5 fast-follow (F5): the placeholder regex is /\{\{(\w+)\}\}/ —
  // \w is ASCII-only, so only a LATIN word in braces can be mistaken for a
  // placeholder ("словоЛатиницей" per the review finding). The old two-pass
  // composition ran the header-level fillPlaceholders over the STRING that
  // already contained the rendered line block, so an item name literally
  // containing "{{LatinWord}}" was silently eaten as an unfilled
  // placeholder. This reproduces that exact shape with the fix in place.
  it('prints a literal "{{LatinWord}}" inside line data without mangling it', () => {
    const lineBlockTemplate = extractLineBlockTemplate(TEMPLATE);
    const renderedLinesHtml = fillPlaceholders(lineBlockTemplate, {
      item_name: 'Кабель {{HDMI}} PRO',
    });

    const result = fillPrintTemplate({
      template: TEMPLATE,
      headerValues: { header_name: 'Счёт № 1' },
      renderedLinesHtml,
    });

    expect(result).toContain('Кабель {{HDMI}} PRO');
  });

  // Header values are substituted last (they're a fillPlaceholders `values`
  // argument, never re-scanned as template text), so this path was never
  // actually at risk — kept as a contract test so a future refactor can't
  // silently reintroduce the two-pass shape here either.
  it('prints a literal "{{LatinWord}}" inside a header value without mangling it', () => {
    const result = fillPrintTemplate({
      template: TEMPLATE,
      headerValues: { header_name: 'ООО «Ромашка {{PLUS}}»' },
      renderedLinesHtml: '',
    });

    expect(result).toContain('ООО «Ромашка {{PLUS}}»');
  });
});

// T4 (Phase 8): a workspace print-template override may use a placeholder
// name the print service doesn't fill (typo or genuinely unsupported) — the
// ruling says that's not an error and it should stay visible, not be
// silently blanked the way fillPlaceholders treats a normal missing key.
describe('getTemplatePlaceholderNames / findUnknownPlaceholderNames / withUnknownPlaceholdersPreserved', () => {
  it('lists distinct placeholder names in a template, deduplicated', () => {
    expect(getTemplatePlaceholderNames('{{a}} {{b}} {{a}}')).toEqual([
      'a',
      'b',
    ]);
  });

  it('finds only the placeholder names not in the known set', () => {
    const result = findUnknownPlaceholderNames(
      '{{known}} {{typo}} {{known}}',
      new Set(['known']),
    );

    expect(result).toEqual(['typo']);
  });

  it('leaves an unknown placeholder as literal text through fillPlaceholders instead of blanking it', () => {
    const augmented = withUnknownPlaceholdersPreserved(
      '{{known}} {{clown_car}}',
      { known: 'значение' },
      new Set(['known']),
    );

    expect(fillPlaceholders('{{known}} {{clown_car}}', augmented)).toBe(
      'значение {{clown_car}}',
    );
  });

  it('is a no-op when every placeholder in the template is known', () => {
    const values = { known: 'значение' };
    const augmented = withUnknownPlaceholdersPreserved(
      '{{known}}',
      values,
      new Set(['known']),
    );

    expect(augmented).toEqual(values);
  });
});

// Task 7 (Фаза 9): a second block kind, appearing 0 or 1 times — used for the
// SCHET template's optional СБП-QR block (see sales-invoice-print.service.ts).
describe('extractNamedBlockTemplate / spliceNamedBlock', () => {
  const TEMPLATE_WITH_NAMED_BLOCK = [
    '<div>before</div>',
    '<!-- BEGIN sbpQr -->',
    '<img src="{{sbpQr}}">',
    '<!-- END sbpQr -->',
    '<div>after</div>',
  ].join('\n');

  it('extracts the inner content of a named block', () => {
    expect(extractNamedBlockTemplate(TEMPLATE_WITH_NAMED_BLOCK, 'sbpQr')).toBe(
      '\n<img src="{{sbpQr}}">\n',
    );
  });

  it('returns null when the template has no such block', () => {
    expect(extractNamedBlockTemplate('<div>plain</div>', 'sbpQr')).toBeNull();
  });

  it('replaces the block (markers + content) with already-rendered HTML', () => {
    const result = spliceNamedBlock(
      TEMPLATE_WITH_NAMED_BLOCK,
      'sbpQr',
      '<img src="data:image/png;base64,AAAA">',
    );

    expect(result).toBe(
      '<div>before</div>\n<img src="data:image/png;base64,AAAA">\n<div>after</div>',
    );
  });

  it('omits the block entirely when replacement is an empty string — no leftover empty markup', () => {
    const result = spliceNamedBlock(TEMPLATE_WITH_NAMED_BLOCK, 'sbpQr', '');

    expect(result).toBe('<div>before</div>\n\n<div>after</div>');
    expect(result).not.toContain('img');
  });

  it('is a no-op on a template that has no such block (a custom override with no marker)', () => {
    const plain = '<div>{{sbpQr}} used flat, no marker</div>';

    expect(spliceNamedBlock(plain, 'sbpQr', '<img>')).toBe(plain);
  });
});
