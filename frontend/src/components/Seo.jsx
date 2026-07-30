// Per-page SEO tags — title, meta description, Open Graph, Twitter card,
// canonical link, and JSON-LD structured data.
//
// Uses React 19's native support for rendering <title>/<meta>/<link>
// anywhere in the component tree: React automatically hoists them into
// <head> and de-duplicates by tag+key, so no react-helmet (or any other
// head-management library) is needed. See:
// https://react.dev/reference/react-dom/components/title
//
// Usage: render this once near the top of a public page component, fed
// straight from the `seo` object the backend already returns (see
// app/seo/generator.py — CoupleWebsiteDetail.seo / BirthdayPageDetail.seo).
//
//   <Seo seo={data.seo} fallbackTitle="Planazo" />

const SITE_NAME = 'Planazo'

export default function Seo({ seo, fallbackTitle = SITE_NAME }) {
  if (!seo) {
    return <title>{fallbackTitle}</title>
  }

  const {
    title,
    description,
    canonical_url: canonicalUrl,
    og_title: ogTitle,
    og_description: ogDescription,
    og_image: ogImage,
    og_type: ogType,
    twitter_card: twitterCard,
    robots,
    json_ld: jsonLd,
  } = seo

  return (
    <>
      <title>{title || fallbackTitle}</title>
      {description && <meta name="description" content={description} />}
      {robots && <meta name="robots" content={robots} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Open Graph */}
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:type" content={ogType || 'website'} />
      {(ogTitle || title) && <meta property="og:title" content={ogTitle || title} />}
      {(ogDescription || description) && <meta property="og:description" content={ogDescription || description} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      {/* Twitter */}
      <meta name="twitter:card" content={twitterCard || 'summary_large_image'} />
      {(ogTitle || title) && <meta name="twitter:title" content={ogTitle || title} />}
      {(ogDescription || description) && <meta name="twitter:description" content={ogDescription || description} />}
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {/* JSON-LD structured data — one <script> per schema object */}
      {Array.isArray(jsonLd) && jsonLd.map((schema, i) => (
        <script
          key={`jsonld-${i}`}
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  )
}
