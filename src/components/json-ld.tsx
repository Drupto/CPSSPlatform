/**
 * Renders one or more JSON-LD structured-data objects inside a
 * `<script type="application/ld+json">` tag.
 *
 * Server component — safe to render in any layout or page.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}