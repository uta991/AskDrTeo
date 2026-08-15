/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // monorepo — Next-მა ფესვი სწორად უნდა იპოვოს
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
};

export default nextConfig;
