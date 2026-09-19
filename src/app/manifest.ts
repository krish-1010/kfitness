import type { MetadataRoute } from "next";

// Installable-only scope for now (Add to Home Screen / desktop install) --
// deliberately no offline caching strategy here, that overlaps with the
// separately-planned local-first sync work.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cut Tracker",
    short_name: "Cut Tracker",
    description: "Personal protein/calorie/supplement/weight/workout log",
    start_url: "/",
    display: "standalone",
    background_color: "#15140F",
    theme_color: "#15140F",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
