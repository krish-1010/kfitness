import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "FitR",
  description: "Protein/calorie/supplement/weight log",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FitR",
  },
};

export const viewport: Viewport = {
  themeColor: "#15140F",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Pre-hydration theme correction: <html> renders "dark" by default
            (matches this app's current-and-default look), so this only
            needs to run when a previously-saved choice was "light" — reads
            a plain, non-httpOnly cookie written by ThemeContext.setTheme
            alongside its settings-table PATCH, so a returning user with a
            saved light preference never sees a dark flash before paint. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(?:^|; )theme=([^;]+)/);if(m&&m[1]==='light'){document.documentElement.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
