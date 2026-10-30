import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { colors } from "@/lib/designTokens";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "Dumraon Cab",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: colors["background-primary"],
    theme_color: colors["chinkara-green-950"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
