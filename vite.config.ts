import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/Lich-am-va-loi-nhac-lich-am/",
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Âm Lịch Việt Nam",
        short_name: "Âm Lịch Việt Nam",
        description: "Tra cứu lịch âm dương - Tạo lời nhắc theo ngày âm lịch trong nhiều năm tiếp theo.",
        theme_color: "#7c3aed",
        background_color: "#ffffff",
        display: "standalone",
        start_url: ".",
        icons: [
          { src: "icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
          { src: "icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
          { src: "icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg}"],
      },
    }),
  ],
});
