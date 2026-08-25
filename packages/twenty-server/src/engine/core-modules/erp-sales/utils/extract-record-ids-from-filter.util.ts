import { isDefined } from 'twenty-shared/utils';

type RecordFilterNode = Record<string, unknown>;

const extractIdsFromIdCondition = (
  idCondition: unknown,
): string[] | undefined => {
  if (!isDefined(idCondition) || typeof idCondition !== 'object') {
    return undefined;
  }

  const { eq, in: inValues } = idCondition as { eq?: unknown; in?: unknown };

  if (typeof eq === 'string') {
    return [eq];
  }

  if (Array.isArray(inValues)) {
    return inValues.filter(
      (value): value is string => typeof value === 'string',
    );
  }

  return undefined;
};

// Returns a superset of the record ids a mutation filter can touch, or
// undefined when the filter does not bound the set by id — callers must then
// fail closed. `and`: any bounded child bounds the whole node; `or`: every
// child must be bounded, otherwise the union is unbounded.
export const extractRecordIdsFromFilter = (
  filter: unknown,
): string[] | undefined => {
  if (!isDefined(filter) || typeof filter !== 'object') {
    return undefined;
  }

  const filterNode = filter as RecordFilterNode;

  const directIds = extractIdsFromIdCondition(filterNode.id);

  if (isDefined(directIds)) {
    return directIds;
  }

  if (Array.isArray(filterNode.and)) {
    for (const childFilter of filterNode.and) {
      const childIds = extractRecordIdsFromFilter(childFilter);

      if (isDefined(childIds)) {
        return childIds;
      }
    }

    return undefined;
  }

  if (Array.isArray(filterNode.or)) {
    const collectedIds: string[] = [];

    for (const childFilter of filterNode.or) {
      const childIds = extractRecordIdsFromFilter(childFilter);

      if (!isDefined(childIds)) {
        return undefined;
      }

      collectedIds.push(...childIds);
    }

    return collectedIds;
  }

  return undefined;
};
