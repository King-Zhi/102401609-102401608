// Each case gets its own storage without changing the browser's saved posts.
function runUnitTest(test, assert) {
  const originalGetStorage = DataManager.getStorage;
  const originalSaveItems = DataManager.saveItems;
  const values = new Map([
    ['CAMPUS_LOST_FOUND_ITEMS_V2', JSON.stringify(initialMockData)]
  ]);
  const storage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); }
  };
  DataManager.getStorage = () => storage;
  try {
    test.testFn(assert, storage);
  } finally {
    DataManager.getStorage = originalGetStorage;
    DataManager.saveItems = originalSaveItems;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = runUnitTest;
}
