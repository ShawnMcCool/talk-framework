// Pure parser for the image-row block.
//
// An image-only paragraph is a paragraph whose text contains nothing but
// one or more standard markdown image tokens (`![alt](src)`) and whitespace.
// `parseImageOnlyParagraph` returns the parsed images, or `null` if the
// paragraph contains anything else (text, html, mixed inline content).
//
// We keep this narrow on purpose: the auto-row rule only kicks in when the
// paragraph is *only* images. A paragraph that mixes prose and images stays
// a normal paragraph with an inline `<img>`.

const IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)\)/g;

/**
 * Parse an image-only paragraph into an array of image specs.
 *
 * @param {string} text — the joined paragraph text.
 * @returns {Array<{ src: string, alt: string }> | null}
 */
export function parseImageOnlyParagraph(text) {
  if (typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (trimmed === '') return null;

  const images = [];
  let cursor = 0;
  IMAGE_RE.lastIndex = 0;
  let match;
  while ((match = IMAGE_RE.exec(trimmed)) !== null) {
    const between = trimmed.slice(cursor, match.index);
    if (between.trim() !== '') return null;
    images.push({ alt: match[1], src: match[2] });
    cursor = match.index + match[0].length;
  }
  const tail = trimmed.slice(cursor);
  if (tail.trim() !== '') return null;
  if (images.length === 0) return null;
  return images;
}
