import { dom } from './m_dom.js';

export const showCopyMessage = () => {
  dom.copyMessage.classList.add('show');
  setTimeout(() => dom.copyMessage.classList.remove('show'), 1500);
};

export const copyToClipboard = (text) => {
  if (!text) return;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showCopyMessage();
  } catch (err) {
    console.error('Không thể sao chép văn bản: ', err);
  } finally {
    document.body.removeChild(textarea);
  }
};

export const getLineWithMostUppercase = (group) => {
  const vietnameseUppercaseRegex = /[A-ZÀÁẠẢÃĂẰẮẲẶẴÂẦẤẨẬẪĐÈÉẸẺẼÊỀẾỂỆỄÌÍỊỈĨÒÓỌỎÕÔỒỐỔỘỖƠỜỚỞỢỠÙÚỤỦŨƯỪỨỬỰỮỲÝỴỶỸ]/g;
  return group.reduce((best, current) => {
    const parseLineContent = (line) => {
      const lineWithoutDollar = line.startsWith('$') ? line.substring(1) : line;
      const parts = lineWithoutDollar.split('=');
      return {
        vietnamesePart: parts.length > 1 ? parts.slice(1).join('=') : lineWithoutDollar
      };
    };
    const bestCount = (parseLineContent(best).vietnamesePart.match(vietnameseUppercaseRegex) || []).length;
    const currentCount = (parseLineContent(current).vietnamesePart.match(vietnameseUppercaseRegex) || []).length;
    return currentCount > bestCount ? current : best;
  });
};