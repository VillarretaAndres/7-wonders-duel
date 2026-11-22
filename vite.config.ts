import { defineConfig } from "vite";

export default defineConfig({
    server: {
        port: 5173,
        host: true,
        allowedHosts: true,
        proxy: {
            "/api": {
                target: "http://127.0.0.1:2567",
                changeOrigin: true,
            },
            "/colyseus": {
                target: "http://127.0.0.1:2567",
                changeOrigin: true,
                ws: true,
                rewrite: path => path.replace(/^\/colyseus/, ""),
            },
        },
    },
    build: {
        target: "esnext",
    },
});
