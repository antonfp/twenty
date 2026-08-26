export const getObjectFilterFields = (objectSingleName: string) => {
  if (['workspaceMember', 'person'].includes(objectSingleName)) {
    return ['name.firstName', 'name.lastName'];
  }

  // "Умный грид" (Task 5): search the item picker by название AND артикул.
  if (objectSingleName === 'item') {
    return ['name', 'sku'];
  }

  return ['name'];
};
