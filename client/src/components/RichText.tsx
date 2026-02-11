import DOMPurify from 'dompurify';

export function RichText({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html, {
    ADD_TAGS: ['figure'],
    ADD_ATTR: ['class', 'data-type', 'data-size', 'data-align'],
    ALLOW_DATA_ATTR: true
  });
  return <div className="rich-content" dangerouslySetInnerHTML={{ __html: clean }} />;
}
