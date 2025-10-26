/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
  remotePatterns: [
    {
      protocol: 'https',
      hostname: 'lh3.googleusercontent.com',
    },
    {
        protocol: 'https',
        hostname: 'cdn-icons-png.flaticon.com',
        pathname: '/**',
      },
  ],
},
  compiler: {
    styledComponents: true,
  },

};

export default nextConfig;
