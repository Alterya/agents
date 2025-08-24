export type OpenGraphMeta = {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  siteName?: string;
};

export function buildOpenGraphTags(meta: OpenGraphMeta): Record<string, string> {
  const tags: Record<string, string> = {};
  tags["og:title"] = meta.title;
  if (meta.description) tags["og:description"] = meta.description;
  if (meta.url) tags["og:url"] = meta.url;
  if (meta.image) tags["og:image"] = meta.image;
  if (meta.siteName) tags["og:site_name"] = meta.siteName;
  return tags;
}

export function buildTwitterTags(meta: OpenGraphMeta): Record<string, string> {
  const tags: Record<string, string> = {};
  tags["twitter:card"] = meta.image ? "summary_large_image" : "summary";
  tags["twitter:title"] = meta.title;
  if (meta.description) tags["twitter:description"] = meta.description;
  if (meta.image) tags["twitter:image"] = meta.image;
  return tags;
}



