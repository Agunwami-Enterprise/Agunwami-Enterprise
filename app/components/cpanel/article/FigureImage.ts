/**
 * The article image: TipTap's image with a description, shown as its caption
 * unless the writer hides it. Saved as
 * <figure><img alt …><figcaption>…</figcaption></figure> when the description
 * shows, or a plain <img> (keeping a hidden one in data-description), which
 * the site's HTML cleaner keeps. An image brought in from a file (e.g. a
 * PDF's logo) can keep its size, as a width (style="width: 30%") and an
 * alignment (data-align); others fill the column.
 */

import Image from '@tiptap/extension-image';

/** A width that can be kept: a percentage or pixels, from the style or the width attribute. */
function widthOf(element: HTMLElement): string | null {
  const style = element.style.width.trim();
  if (/^\d+(\.\d+)?(%|px)$/.test(style)) return style;
  const attr = element.getAttribute('width')?.trim() ?? '';
  return /^\d+$/.test(attr) ? `${attr}px` : null;
}

const ALIGNS = ['left', 'center', 'right'];

export const FigureImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: '',
        // A shown description is the figure's caption; a hidden one is kept on the image.
        parseHTML: element => {
          const figure = element.closest('figure');
          if (figure) return figure.querySelector('figcaption')?.textContent?.trim() ?? '';
          return element.getAttribute('data-description')?.trim() ?? '';
        },
        renderHTML: () => ({}),
      },
      width: {
        default: null,
        parseHTML: element => widthOf(element.tagName === 'IMG' ? element : element.querySelector('img') ?? element),
        renderHTML: attrs => (attrs.width ? { style: `width: ${attrs.width}` } : {}),
      },
      align: {
        default: null,
        parseHTML: element => {
          const img = element.tagName === 'IMG' ? element : element.querySelector('img');
          const align = img?.getAttribute('data-align') ?? '';
          return ALIGNS.includes(align) ? align : null;
        },
        renderHTML: attrs => (attrs.align ? { 'data-align': attrs.align } : {}),
      },
      /** Show the description under the image (as its caption). */
      showCaption: {
        default: true,
        parseHTML: element => !(element.tagName === 'IMG' && element.hasAttribute('data-description') && !element.closest('figure')),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure',
        getAttrs: element => {
          const img = (element as HTMLElement).querySelector('img');
          if (!img) return false;
          return {
            src: img.getAttribute('src'),
            alt: img.getAttribute('alt') ?? '',
            title: img.getAttribute('title'),
            caption: (element as HTMLElement).querySelector('figcaption')?.textContent?.trim() ?? '',
            width: widthOf(img),
            align: ALIGNS.includes(img.getAttribute('data-align') ?? '') ? img.getAttribute('data-align') : null,
          };
        },
      },
      { tag: 'img[src]:not([src^="data:"])' },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { caption: _caption, showCaption: _show, ...img } = HTMLAttributes as Record<string, unknown>;
    void _caption; void _show;
    const caption = String(node.attrs.caption ?? '').trim();
    if (!caption) return ['img', img];
    return node.attrs.showCaption === false
      ? ['img', { ...img, 'data-description': caption }]
      : ['figure', {}, ['img', img], ['figcaption', {}, caption]];
  },
});
