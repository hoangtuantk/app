export const state = {
  originalUniqueLines: [],
  originalDuplicateLines: [],
  displayedUniqueLines: [],
  displayedDuplicateLines: [],
  sortModes: {
    // Mặc định là nhóm xuôi (số nhỏ đến lớn)
    unique: { sortType: null, sortDirection: 1, charCountDirection: 1 },
    duplicate: { sortType: null, sortDirection: 1, charCountDirection: 1 },
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