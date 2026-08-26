import {
  extractLineBlockTemplate,
  fillPlaceholders,
  fillPrintTemplate,
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
