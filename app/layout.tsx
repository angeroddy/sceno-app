import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { JsonLd } from "@/components/seo/json-ld";
import "./globals.css";

const ttFirsNeue = localFont({
  src: [
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial Thin Italic.ttf",
      weight: "100",
      style: "italic",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial ExtraLight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial ExtraLight Italic.ttf",
      weight: "200",
      style: "italic",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial Light Italic.ttf",
      weight: "300",
      style: "italic",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial Medium Italic.ttf",
      weight: "500",
      style: "italic",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial DemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial DemiBold Italic.ttf",
      weight: "600",
      style: "italic",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial Bold Italic.ttf",
      weight: "700",
      style: "italic",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial ExtraBold.ttf",
      weight: "800",
      style: "normal",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial ExtraBold Italic.ttf",
      weight: "800",
      style: "italic",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial Black.ttf",
      weight: "900",
      style: "normal",
    },
    {
      path: "./assets/fonts/tt_firs_neue/TT Firs Neue Trial Black Italic.ttf",
      weight: "900",
      style: "italic",
    },
  ],
  variable: "--font-tt-firs-neue",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Permet à env(safe-area-inset-*) de renvoyer les marges des encoches iOS,
  // utilisé par la nav mobile fixée en bas (.pb-safe).
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    default: "formations-artistiques.fr — Préventes et dernières minutes pour comédiens",
    template: "%s | formations-artistiques.fr",
  },
  description:
    "Découvrez des offres exclusives sur les stages, ateliers, formations et sessions pour comédiens. Préventes et dernières minutes à prix réduits (-25% minimum).",
  keywords: [
    "comédien",
    "formation",
    "stage",
    "atelier",
    "théâtre",
    "cinéma",
    "prévente",
    "dernière minute",
    "réduction",
    "formations-artistiques.fr",
  ],
  authors: [{ name: "formations-artistiques.fr" }],
  creator: "formations-artistiques.fr",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://formations-artistiques.fr"),
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "formations-artistiques.fr",
    title: "formations-artistiques.fr — Préventes et dernières minutes pour comédiens",
    description:
      "Offres exclusives sur les stages, ateliers et formations pour comédiens. Prix réduits (-25% minimum).",
  },
  twitter: {
    card: "summary_large_image",
    title: "formations-artistiques.fr — Préventes et dernières minutes pour comédiens",
    description:
      "Offres exclusives sur les stages, ateliers et formations pour comédiens. Prix réduits (-25% minimum).",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${ttFirsNeue.variable} antialiased`}
      >
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "formations-artistiques.fr",
            url: process.env.NEXT_PUBLIC_SITE_URL || "https://formations-artistiques.fr",
            description:
              "Préventes et dernières minutes de stages, ateliers et formations pour comédiens.",
          }}
        />
        {children}
      </body>
    </html>
  );
}
