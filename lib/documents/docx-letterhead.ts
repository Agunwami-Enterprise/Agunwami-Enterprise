/** A Word file's letterhead: the picture in its page header placed behind the text over the whole page. */

import JSZip from 'jszip';

/**
 * The header's pictures, which html-to-docx places in line, made into pictures
 * anchored to the page's top-left corner behind the text (Word's "Behind text").
 */
export async function anchorHeaderPictures(file: Uint8Array): Promise<Uint8Array> {
  const zip = await JSZip.loadAsync(file);
  for (const name of Object.keys(zip.files).filter(n => /^word\/header\d*\.xml$/.test(n))) {
    const xml = await zip.file(name)!.async('string');
    const anchored = xml
      .replace(/<inline(\s[^>]*xmlns="http:\/\/schemas\.openxmlformats\.org\/drawingml\/2006\/wordprocessingDrawing"[^>]*)>/g,
        '<anchor$1 simplePos="0" relativeHeight="0" behindDoc="1" locked="1" layoutInCell="1" allowOverlap="1">'
        + '<simplePos x="0" y="0"/><positionH relativeFrom="page"><posOffset>0</posOffset></positionH>'
        + '<positionV relativeFrom="page"><posOffset>0</posOffset></positionV>')
      .replace(/(<effectExtent\b[^>]*\/>)(\s*<docPr\b)/g, '$1<wrapNone/>$2')
      .replace(/<\/inline>/g, '</anchor>');
    zip.file(name, anchored);
  }
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
