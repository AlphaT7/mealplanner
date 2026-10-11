module.exports = {
  globDirectory: "dist/",
  globPatterns: ["**/*.{js,css,png,ico,jpg,html,webmanifest,txt}"],
  swDest: "dist/sw.js",
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "MealPlanner",
        networkTimeoutSeconds: 4,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5,
        },
      },
    },
  ],
};
