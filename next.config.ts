import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // L'espace comédien a été renommé /dashboard -> /comedien.
      // On redirige durablement les anciennes URLs (liens, favoris, e-mails déjà envoyés).
      {
        source: "/dashboard",
        destination: "/comedien",
        permanent: true,
      },
      {
        source: "/dashboard/:path*",
        destination: "/comedien/:path*",
        permanent: true,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'brygmtgetzcmogoitdwz.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
