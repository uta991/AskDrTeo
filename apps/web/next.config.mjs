/** @type {import('next').NextConfig} */
const nextConfig = {
  // პაკეტი TypeScript-წყაროდ იგზავნება — Next თავად უნდა ააგოს
  transpilePackages: ['@askdrteo/dosing', '@askdrteo/milestones'],
  reactStrictMode: true,
  // monorepo — Next-მა ფესვი სწორად უნდა იპოვოს
  outputFileTracingRoot: new URL('../../', import.meta.url).pathname,
};

export default nextConfig;
