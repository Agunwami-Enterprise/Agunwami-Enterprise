/**
 * The article image: TipTap's image with a visible caption (its description).
 * Saved as <figure><img alt …><figcaption>…</figcaption></figure> when it has
 * a caption, or a plain <img> without one, which the site's HTML cleaner keeps.
 */

import Image from '@tiptap/extension-image';

export const FigureImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: '',
        parseHTML: element => element.closest('figure')?.querySelector('figcaption')?.textContent?.trim() ?? '',
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
          };
        },
      },
      { tag: 'img[src]:not([src^="data:"])' },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { caption: _caption, ...img } = HTMLAttributes as Record<string, unknown>;
    void _caption;
    const caption = String(node.attrs.caption ?? '').trim();
    return caption ? ['figure', {}, ['img', img], ['figcaption', {}, caption]] : ['img', img];
  },
});
