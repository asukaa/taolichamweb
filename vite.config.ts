import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Tạo Lịch Âm - Nhắc ngày giỗ",
        short_name: "Lịch Âm",
        description: "Nhập ngày giỗ âm lịch, xem ngày dương lịch tương ứng từng năm và xuất lịch nhắc.",
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
