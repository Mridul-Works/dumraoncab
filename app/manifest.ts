import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "Dumraon Cab",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#faf9f4",
    theme_color: "#0a4f37",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
