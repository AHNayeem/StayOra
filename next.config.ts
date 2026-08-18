import type { NextConfig } from "next";

/**
 * LocatorJS click-to-source, development only.
 *
 * React 19 dropped `fiber._debugSource`, so LocatorJS's React adapter can no
 * longer discover file locations at runtime. Instead we let its Babel plugin
 * stamp every JSX element with `data-locatorjs="<abs path>:<line>:<col>"`, and
 * run the runtime in `jsx` adapter mode, which reads that attribute.
 *
 * Turbopack still uses SWC for all of Next.js' own transforms; Babel only runs
 * as a pre-pass over our own `.tsx` files (`not: "foreign"` excludes
 * node_modules). The rule is omitted entirely outside `next dev`, so
 * `next build` output is byte-for-byte unaffected.
 */
const locatorRules: NonNullable<NextConfig["turbopack"]>["rules"] = {
  "*.tsx": {
    condition: { not: "foreign" },
    loaders: [
      {
        loader: "babel-loader",
        options: {
          babelrc: false,
          configFile: false,
          sourceMaps: true,
          plugins: [
            ["@babel/plugin-syntax-typescript", { isTSX: true }],
            "@babel/plugin-syntax-jsx",
            [
              "@locator/babel-jsx/dist",
              { env: "development", dataAttribute: "path" },
            ],
          ],
        },
      },
    ],
  },
};

// Set `LOCATOR=0` before `bun run dev` to skip the Babel pre-pass if you ever
// want the fastest possible dev compiles.
const locatorEnabled =
  process.env.NODE_ENV === "development" && process.env.LOCATOR !== "0";

const nextConfig: NextConfig = {
  ...(locatorEnabled
    ? {
        turbopack: { rules: locatorRules },
        // We configure babel-loader ourselves above; opt out of Turbopack's
        // automatic Babel wiring so the two can't stack up.
        experimental: { turbopackUseBuiltinBabel: false },
      }
    : {}),
  images: {
    // Hero and card imagery is sourced from Unsplash during design build-out.
    // Swap these patterns for your own asset host when wiring real data.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        // Placeholder avatar imagery during design build-out.
        protocol: "https",
        hostname: "i.pravatar.cc",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
