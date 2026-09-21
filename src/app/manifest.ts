import type { MetadataRoute } from "next";

// Installable-only scope for now (Add to Home Screen / desktop install) --
// deliberately no offline caching strategy here, that overlaps with the
// separately-planned local-first sync work.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FitR",
    short_name: "FitR",
    description: "Protein/calorie/supplement/weight/workout log",
    start_url: "/",
    display: "standalone",
    background_color: "#15140F",
    theme_color: "#15140F",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Lets "FitR" appear in the OS share sheet (Android/Chromium
    // only — iOS Safari has no Web Share Target support) once installed to
    // the home screen, so sharing a tutorial video from YouTube/Instagram/
    // etc. lands directly on the share-target page instead of requiring a
    // manual copy-paste of the URL.
    share_target: {
      action: "/share-target",
      method: "GET",
      params: {
        title: "title",
        text: "text",
        url: "url",
      },
    },
  };
}
