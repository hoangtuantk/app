export const state = {
  originalUniqueLines: [],
  originalDuplicateLines: [],
  displayedUniqueLines: [],
  displayedDuplicateLines: [],
  sortModes: {
    unique: { sortType: null, sortDirection: 1, chineseCharCountEnabled: true },
    duplicate: { sortType: null, sortDirection: 1, chineseCharCountEnabled: true },
  },
  comparisonOptions: {
    caseSensitive: false,
    ignoreWhitespace: false,
    ignoreSpecialChars: false,
  },
  conflict: {
    groups: [],
    currentIndex: 0,
    resolvedMap: new Map(),
  },
  lastProcessedInputText: null,
};