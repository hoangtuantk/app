export const generateMergedContent = (processedFiles) => {
  const separator = "\n\n\n/////-----(((PHÂN TÁCH GIỮA CÁC TỆP)))-----\\\\\\\n\n\n";
  return processedFiles.map((file, index) => {
    const fileNumber = index + 1;
    const header = `---(((---BẮT ĐẦU TỆP ${fileNumber}---)))---\n*****### TỆP ${file.path} ###*****\n\n`;
    const footer = `\n\n---(((---KẾT THÚC TỆP ${fileNumber}---)))---`;
    return header + file.content + footer;
  }).join(separator);
};

export const parseMergedContent = (content) => {
  const files = [];
  const separator = "\n\n\n/////-----(((PHÂN TÁCH GIỮA CÁC TỆP)))-----\\\\\\\n\n\n";
  const fileBlocks = content.split(separator);

  const headerRegex = /^---\(\(\(---BẮT ĐẦU TỆP \d+---\)\)\)---\n\*{5}### TỆP (.+?) ###\*{5}\n\n/;
  const footerRegex = /\n\n---\(\(\(---KẾT THÚC TỆP \d+---\)\)\)---$/;

  for (const block of fileBlocks) {
    if (block.trim() === '') continue;
    const headerMatch = block.match(headerRegex);
    if (!headerMatch) {
      console.warn("Khối không khớp với header:", block);
      continue;
    }
    const path = headerMatch[1].trim();
    let fileContent = block.replace(headerRegex, '');
    fileContent = fileContent.replace(footerRegex, '');
    files.push({ path, content: fileContent });
  }
  return files;
};

export const downloadTxtFile = (content, fileName) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};