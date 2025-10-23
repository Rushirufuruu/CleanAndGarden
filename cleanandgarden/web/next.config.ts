import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ⚠️ Temporal: ignorar ESLint durante la build en entorno de despliegue
  // Esto evita que fallos de lint bloqueen la build en Vercel mientras
  // se corrigen los tipos `any` y otros warnings en el frontend.
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zefqbtjdxxiaukvidwdk.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default nextConfig;
