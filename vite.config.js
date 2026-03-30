import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";
import { NodeModulesPolyfillPlugin } from "@esbuild-plugins/node-modules-polyfill";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const verge3dRoot = resolve(__dirname, "public/libs/verge3d");
const jsmRoot = resolve(__dirname, "public/libs/jsm");

export default {
    base: "",
    define: {
       // "process.env.MapboxAccessToken": JSON.stringify(process.env.MapboxAccessToken)
    },
    optimizeDeps: {
        esbuildOptions: {
            plugins: [
                NodeGlobalsPolyfillPlugin({
                    process: true,
                    buffer: true
                }),
                NodeModulesPolyfillPlugin()
            ]
        }
    },
    resolve: {
        alias: [
            // Import maps in public/*.html are not applied during Vite's dep scan;
            // mirror webxr_vr_layers.v3d.html so bare "v3d" / "v3d/addons/*" resolve.
            {
                find: /^v3d\/addons\/(.*)$/,
                replacement: `${jsmRoot}/$1`
            },
            {
                find: "v3d",
                replacement: resolve(verge3dRoot, "build/v3d.module.js")
            },
            // {
            //     find: "@", replacement: resolve(__dirname, "./src"),
            // },
            {
                find: "./runtimeConfig", replacement: "./runtimeConfig.browser"
            },
            {
                find: "util",
                replacement: "rollup-plugin-node-polyfills/polyfills/util"
            }
        ]
    },
    server: { https: true }, // Not needed for Vite 5+
    plugins: [
        basicSsl({
            /** name of certification */
            name: 'test',
            // /** custom trust domains */
            // domains: ['*.custom.com'],
            // /** custom certification directory */
            // certDir: '/Users/.../.devServer/cert'
        }),
    ]
};
