/** @type {import('next').NextConfig} */

const CopyPlugin = require("copy-webpack-plugin");
const path = require("path");

const nextConfig = {
    reactStrictMode: false,
    swcMinify: true,
    images: {
        unoptimized: true,
    },
    publicRuntimeConfig: {
        basePath: "",
    },
    compiler: {
        removeConsole: false,
    },
    webpack: (config, { isServer }) => {
        config.plugins.push(
            new CopyPlugin({
                patterns: [
                    {
                        from: path.join(
                            __dirname,
                            "node_modules/@trustwallet/wallet-core/dist/lib/wallet-core.wasm",
                        ),
                        to: path.join(__dirname, ".next/static/chunks/pages"),
                    },
                ],
            }),
        );
        config.experiments.asyncWebAssembly = true;
        if (!isServer) {
            config.output.publicPath = `/_next/`;
        } else {
            config.output.publicPath = `./`;
        }
        config.resolve.fallback = { 
            fs: false,
            "crypto": require.resolve("crypto-browserify"),
            "stream": require.resolve("stream-browserify"),
            "assert": require.resolve("assert"),
            "http": require.resolve("stream-http"),
            "https": require.resolve("https-browserify"),
            "os": require.resolve("os-browserify"),
            "url": require.resolve("url"),
            "process": require.resolve("process")
        };
        config.output.assetModuleFilename = `node_modules/@trustwallet/dist/lib/wallet-core.wasm`;
        config.module.rules.push({
            test: /\.(wasm)$/,
            type: "asset/resource",
        });
        return config;
    },
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },
};

module.exports = nextConfig;
