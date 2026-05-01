import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/vite";

export default defineConfig(({ command }) => {
	const plugins: Array<Plugin | false> = [
		tanstackStart(),
		react(),
		tailwindcss(),
		tsconfigPaths(),
		command === "build" ? cloudflare() : false,
	];

	return {
		plugins: plugins.filter(Boolean) as Plugin[],
	};
});
