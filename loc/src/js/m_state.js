export const state = {
  originalUniqueLines: [],
  originalDuplicateLines: [],
  displayedUniqueLines: [],
  displayedDuplicateLines: [],
  sortModes: {
    unique: { sortType: null, sortDirection: 1, charCountSortDirection: -1 }, // Mặc định sắp xếp nhiều chữ Hán nhất lên đầu
    duplicate: { sortType: null, sortDirection: 1, charCountSortDirection: -1 }, // Mặc định sắp xếp nhiều chữ Hán nhất lên đầu
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