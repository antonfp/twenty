// erp-sales depends on erp-base (see application-config.ts `dependencies`) and
// extends/references erp-base's objects. Apps are separate SDK projects with
// no cross-project TypeScript imports, so the referenced universalIdentifiers
// are copied here verbatim — they MUST stay in sync with erp-base's
// src/modules/directories/objects/{organization,item}.object.ts.
export const ORGANIZATION_UNIVERSAL_IDENTIFIER =
  'c702b6c3-afeb-4355-803b-e223acbe0205';

export const ITEM_UNIVERSAL_IDENTIFIER =
  'a77a6d5f-0002-47cd-ab92-3e74e8f9d41c';
