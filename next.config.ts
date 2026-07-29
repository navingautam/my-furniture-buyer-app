import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the dev server accept requests forwarded through an ngrok tunnel
  // (needed for hot-reload/dev asset requests, not just page loads).
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.app", "*.ngrok.io"],
};

export default nextConfig;
