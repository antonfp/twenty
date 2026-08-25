import { PostingRulesRegistry } from 'src/engine/core-modules/erp/posting-rules.registry';
import { type PostingRulesProvider } from 'src/engine/core-modules/erp/types/posting.types';

describe('PostingRulesRegistry', () => {
  it('returns an empty array for objects without registered rules', () => {
    const registry = new PostingRulesRegistry();

    expect(registry.resolvePostingRules('salesInvoice')).toEqual([]);
  });

  it('concatenates multiple providers registered for the same object in registration order', () => {
    const registry = new PostingRulesRegistry();
    const blockProvider: PostingRulesProvider = {
      getPartyEntries: () => [],
    };
    const glueProvider: PostingRulesProvider = {
      getGlEntries: () => [],
    };

    registry.registerPostingRules('salesInvoice', blockProvider);
    registry.registerPostingRules('salesInvoice', glueProvider);

    expect(registry.resolvePostingRules('salesInvoice')).toEqual([
      blockProvider,
      glueProvider,
    ]);
  });

  it('keeps providers of different objects isolated', () => {
    const registry = new PostingRulesRegistry();
    const salesProvider: PostingRulesProvider = {};
    const purchaseProvider: PostingRulesProvider = {};

    registry.registerPostingRules('salesInvoice', salesProvider);
    registry.registerPostingRules('purchaseInvoice', purchaseProvider);

    expect(registry.resolvePostingRules('salesInvoice')).toEqual([
      salesProvider,
    ]);
    expect(registry.resolvePostingRules('purchaseInvoice')).toEqual([
      purchaseProvider,
    ]);
  });
});
