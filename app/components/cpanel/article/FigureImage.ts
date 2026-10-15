/**
 * The article image: TipTap's image with a description, shown as its caption
 * unless the writer hides it. Saved as
 * <figure><img alt …><figcaption>…</figcaption></figure> when the description
 * shows, or a plain <img> (keeping a hidden one in data-description), which
 * the site's HTML cleaner keeps.
 */

import Image from '@tiptap/extension-image';

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
