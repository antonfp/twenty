import {
  ERP_POSTING_EXCEPTION_CODE,
  ErpPostingException,
} from 'src/engine/core-modules/erp/erp-posting.exception';
import { type GlEntryInput } from 'src/engine/core-modules/erp/types/posting.types';

// Compare in cents so float noise from summing amounts cannot fail Σдт=Σкт.
const toCents = (value: number): number => Math.round(value * 100);

export const assertGlEntriesBalanced = (glEntries: GlEntryInput[]): void => {
  if (glEntries.length === 0) {
    return;
  }

  const totalDebit = glEntries.reduce(
    (sum, glEntry) => sum + toCents(glEntry.debit),
    0,
  );
  const totalCredit = glEntries.reduce(
    (sum, glEntry) => sum + toCents(glEntry.credit),
    0,
  );

  if (totalDebit !== totalCredit) {
    throw new ErpPostingException(
      `GL entries are unbalanced: total debit ${totalDebit / 100} does not equal total credit ${totalCredit / 100}`,
      ERP_POSTING_EXCEPTION_CODE.UNBALANCED_GL_ENTRIES,
    );
  }
};
