/**
 * JSON-LD Structured Data helpers
 * Implements schema.org structured data per SEO Schema Implementation Guide.
 *
 * Global rules:
 * - All dates must be ISO 8601 with Nepal timezone offset (+05:45)
 * - Omit empty/null properties entirely instead of outputting ""
 * - All schema injected as <script type="application/ld+json"> in <head>
 */

const SITE_URL = "https://abroadkhabar.com";
const SITE_NAME = "Abroad Khabar";
const LOGO_URL = `${SITE_URL}/favicon.ico`;

/**
 * Format a date string to ISO 8601 with Nepal timezone (+05:45).
 * If the date is null/undefined, returns null (caller should omit).
 */
export function toNepalISO(dateStr) {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    // Offset is +05:45 for Nepal (5 hours 45 minutes = 345 minutes)
    const offset = 345;
    const local = new Date(d.getTime() + offset * 60 * 1000);
    const iso = local.toISOString().replace("Z", "");
    return `${iso.slice(0, 19)}+05:45`;
  } catch {
    return null;
  }
}

/**
 * Remove all properties with null/undefined/empty-string values (deep).
 */
function clean(obj) {
  if (obj === null || obj === undefined || obj === "") return undefined;
  if (Array.isArray(obj)) {
    const cleaned = obj.map(clean).filter((x) => x !== undefined);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  if (typeof obj === "object") {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleaned = clean(value);
      if (cleaned !== undefined) result[key] = cleaned;
    }
    return Object.keys(result).length > 0 ? result : undefined;
  }
  return obj;
}

/**
 * Safely stringify an object, omitting empty fields.
 */
export function stringifyLD(obj) {
  return JSON.stringify(clean(obj), null, 2).replace(/</g, "\\u003c");
}

// ──────────────────────────────────────────────
// Site-wide Organization + WebSite
// ──────────────────────────────────────────────

/**
 * Build the NewsMediaOrganization + WebSite @graph for the root layout.
 * This goes on EVERY page (via root layout).
 */
export function siteSchema({ facebook, twitter } = {}) {
  const sameAs = [];
  if (facebook) sameAs.push(facebook);
  if (twitter) sameAs.push(twitter);

  return clean({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "NewsMediaOrganization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: LOGO_URL,
        },
        ...(sameAs.length > 0 ? { sameAs } : {}),
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  });
}

// ──────────────────────────────────────────────
// Homepage — ItemList (Featured Tools)
// ──────────────────────────────────────────────

/**
 * Build the ItemList for the homepage (featured interactive tools).
 * Provide up to 5 tools.
 */
export function homepageToolsSchema(tools = []) {
  if (!tools.length) return null;

  const itemListElement = tools.map((tool, i) =>
    clean({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "SoftwareApplication",
        name: tool.name,
        applicationCategory: tool.category || "UtilitiesApplication",
        url: `${SITE_URL}${tool.path}`,
      },
    }),
  );

  if (!itemListElement.length) return null;

  return clean({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        "@id": `${SITE_URL}/#tools-hub`,
        name: "Featured Interactive Tools",
        itemListElement,
      },
    ],
  });
}

// ──────────────────────────────────────────────
// Article Page (evergreen content)
// ──────────────────────────────────────────────

/**
 * Build Article + BreadcrumbList schema.
 * Use for evergreen content (content_type === 'article').
 */
export function articleSchema({
  url,
  title,
  excerpt,
  publishedAt,
  updatedAt,
  imageUrl,
  authorName,
  authorUrl,
  categoryName,
  categoryUrl,
}) {
  const articleUrl = url || SITE_URL;

  const graph = [
    clean({
      "@type": "Article",
      "@id": `${articleUrl}/#article`,
      headline: title,
      description: excerpt,
      url: articleUrl,
      datePublished: toNepalISO(publishedAt),
      dateModified: toNepalISO(updatedAt || publishedAt),
      image: imageUrl ? [imageUrl] : undefined,
      author: authorName
        ? {
            "@type": "Person",
            name: authorName,
            ...(authorUrl ? { url: authorUrl } : {}),
          }
        : undefined,
      publisher: { "@id": `${SITE_URL}/#organization` },
    }),
  ];

  // BreadcrumbList
  const breadcrumbItems = [{ position: 1, name: "Home", item: SITE_URL }];
  if (categoryName && categoryUrl) {
    breadcrumbItems.push({
      position: 2,
      name: categoryName,
      item: categoryUrl,
    });
  }
  breadcrumbItems.push({ position: breadcrumbItems.length + 1, name: title });

  graph.push(
    clean({
      "@type": "BreadcrumbList",
      "@id": `${articleUrl}/#breadcrumbs`,
      itemListElement: breadcrumbItems.map((crumb) =>
        clean({
          "@type": "ListItem",
          position: crumb.position,
          name: crumb.name,
          ...(crumb.item ? { item: crumb.item } : {}),
        }),
      ),
    }),
  );

  return clean({
    "@context": "https://schema.org",
    "@graph": graph,
  });
}

// ──────────────────────────────────────────────
// News Article Page (breaking / timely updates)
// ──────────────────────────────────────────────

/**
 * Build NewsArticle + BreadcrumbList schema.
 * Use for breaking news / timely updates (content_type === 'news').
 * Images must be at least 1200px wide for Google Discover.
 */
export function newsArticleSchema({
  url,
  title,
  excerpt,
  publishedAt,
  updatedAt,
  images: imageUrls,
  authorName,
  authorUrl,
  categoryName,
  categoryUrl,
}) {
  const articleUrl = url || SITE_URL;

  const graph = [
    clean({
      "@type": "NewsArticle",
      "@id": `${articleUrl}/#article`,
      headline: title,
      description: excerpt,
      url: articleUrl,
      datePublished: toNepalISO(publishedAt),
      dateModified: toNepalISO(updatedAt || publishedAt),
      image: imageUrls && imageUrls.length > 0 ? imageUrls : undefined,
      author: authorName
        ? {
            "@type": "Person",
            name: authorName,
            ...(authorUrl ? { url: authorUrl } : {}),
          }
        : undefined,
      publisher: { "@id": `${SITE_URL}/#organization` },
    }),
  ];

  // BreadcrumbList
  const breadcrumbItems = [{ position: 1, name: "Home", item: SITE_URL }];
  if (categoryName && categoryUrl) {
    breadcrumbItems.push({
      position: 2,
      name: categoryName,
      item: categoryUrl,
    });
  }
  breadcrumbItems.push({ position: breadcrumbItems.length + 1, name: title });

  graph.push(
    clean({
      "@type": "BreadcrumbList",
      "@id": `${articleUrl}/#breadcrumbs`,
      itemListElement: breadcrumbItems.map((crumb) =>
        clean({
          "@type": "ListItem",
          position: crumb.position,
          name: crumb.name,
          ...(crumb.item ? { item: crumb.item } : {}),
        }),
      ),
    }),
  );

  return clean({
    "@context": "https://schema.org",
    "@graph": graph,
  });
}

// ──────────────────────────────────────────────
// Interactive Tool Page (WebApplication)
// ──────────────────────────────────────────────

/**
 * Build WebApplication + BreadcrumbList schema.
 * Used for dedicated tool pages (Date Converter, SOP Evaluator, etc.).
 *
 * Note: If the tool has no rating/review system yet, omit aggregateRating.
 */
export function toolSchema({
  url,
  name,
  description,
  category = "UtilitiesApplication",
  averageRating,
  totalReviews,
}) {
  const toolUrl = url || SITE_URL;

  const graph = [
    clean({
      "@type": "WebApplication",
      "@id": `${toolUrl}/#software`,
      name,
      description,
      url: toolUrl,
      applicationCategory: category,
      operatingSystem: "All",
      browserRequirements: "Requires JavaScript",
      offers: {
        "@type": "Offer",
        price: "0.00",
        priceCurrency: "NPR",
      },
      ...(averageRating != null && totalReviews != null
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: String(averageRating),
              ratingCount: String(totalReviews),
            },
          }
        : {}),
      publisher: { "@id": `${SITE_URL}/#organization` },
    }),
  ];

  // BreadcrumbList
  graph.push(
    clean({
      "@type": "BreadcrumbList",
      "@id": `${toolUrl}/#breadcrumbs`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: "Tools",
          item: `${SITE_URL}/tools/`,
        },
        { "@type": "ListItem", position: 3, name },
      ].map((crumb) =>
        clean({
          "@type": "ListItem",
          position: crumb.position,
          name: crumb.name,
          ...(crumb.item ? { item: crumb.item } : {}),
        }),
      ),
    }),
  );

  return clean({
    "@context": "https://schema.org",
    "@graph": graph,
  });
}

// ──────────────────────────────────────────────
// Generic BreadcrumbList (for any page)
// ──────────────────────────────────────────────

/**
 * Build a generic BreadcrumbList schema for any page.
 * @param {Array<{name: string, item?: string}>} crumbs - Breadcrumb items (position is auto-assigned).
 * @param {string} pageUrl - The URL of the current page (used as @id).
 */
export function breadcrumbSchema(crumbs = [], pageUrl = SITE_URL) {
  if (!crumbs.length) return null;

  const itemListElement = crumbs.map((crumb, i) =>
    clean({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      ...(crumb.item ? { item: crumb.item } : {}),
    }),
  );

  return clean({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "@id": `${pageUrl}/#breadcrumbs`,
        itemListElement,
      },
    ],
  });
}

export function generalAuthorSchema({
  publicDisplayName,
  firstName,
  lastName,
  nickname,
  email,
  bioEnglish,
  bioSecondLocale,
  profilePicture,
  jobTitle,
  companName,
  companyUrl,
  socialLink1,
  socialLink2,
  socialLink3,
  socialLink4,
  socialLink5,
  secondLocale,
}) {
  const websiteUrl = SITE_URL;
  const graph = [
    clean({
      "@type": "Person",
      "@id": `${websiteUrl}/#author`,
      name: publicDisplayName,
      givenName: firstName,
      familyName: lastName,
      additionalName: nickname,
      email: email,
      url: websiteUrl,
      description: [
        {
          "@language": "en",
          "@value": bioEnglish,
        },
        {
          "@language": secondLocale,
          "@value": bioSecondLocale,
        },
      ],
      image: {
        "@type": "ImageObject",
        url: profilePicture,
      },
      jobTitle: jobTitle,
      worksFor: {
        "@type": "Organization",
        name: companName,
        url: companyUrl,
      },
      sameAs: [socialLink1, socialLink2, socialLink3, socialLink4, socialLink5],
    }),
  ];
  return clean({
    "@context": "https://schema.org",
    "@graph": graph,
  });
}

export function authorSchema({ name, bio, email, avatarUrl, authorUrl, socialLinks = [] }) {
  const person = clean({
    "@type": "Person",
    "@id": authorUrl ? `${authorUrl}#author` : undefined,
    name,
    email,
    url: authorUrl,
    description: bio,
    image: avatarUrl ? clean({ "@type": "ImageObject", url: avatarUrl }) : undefined,
    sameAs: socialLinks.filter(Boolean), // drop empty/undefined entries
  });

  return {
    "@context": "https://schema.org",
    "@graph": [person],
  };
}
