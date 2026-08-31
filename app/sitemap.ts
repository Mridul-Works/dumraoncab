import type { MetadataRoute } from "next";
import { routes, services, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: site.url, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${site.url}/booking`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${site.url}/services`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/fleet`, lastModified, changeFrequency: "monthly", priority: 0.8 },
    { url: `${site.url}/about`, lastModified, changeFrequency: "monthly", priority: 0.6 },
    { url: `${site.url}/contact`, lastModified, changeFrequency: "monthly", priority: 0.6 },
  ];

  const servicePages: MetadataRoute.Sitemap = services.map((s) => ({
    url: `${site.url}/services/${s.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const routePages: MetadataRoute.Sitemap = routes.map((r) => ({
    url: `${site.url}/routes/${r.slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...servicePages, ...routePages];
}
