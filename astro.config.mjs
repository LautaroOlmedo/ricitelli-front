import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  vite: {
    plugins: [tailwindcss()],
    ssr: {
      // gRPC has native bindings — let Node resolve them, not Vite
      external: ["@grpc/grpc-js", "@grpc/proto-loader"],
    },
  },
});
