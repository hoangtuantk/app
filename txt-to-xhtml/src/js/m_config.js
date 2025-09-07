export const config = {
  debounceDelay: 300,
  minBusyDisplayTime: 200,
  settingsKey: 'textConverterStateV3',
  defaultHeader: `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">\n\n<html xmlns="http://www.w3.org/1999/xhtml">\n<head>\n  <title></title>\n  <link href="../Styles/stylesheet.css" rel="stylesheet" type="text/css"/>\n</head>\n<body>`,
  defaultFooter: `</body>\n</html>`,
  defaultFilterRules: [
    { type: 'regular', name: ' ', find: " ", replace: " ", caseSensitive: false, wholeWord: false, enabled: false, lineMatchMode: 'contains' }
  ],
};