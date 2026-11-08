// Exact reviewed Next.js error styles and the fixed admin spinner, never user CSS.
export const trustedStyleHashes = Object.freeze([
  "'sha256-Wwucq8eX2r0YFymkQhDXm5hN0+FfSvI3s4JSSaqa4iw='",
  "'sha256-Z5XTK23DFuEMs0PwnyZDO9SWxemQ5HxcpVaBNuUJyWY='",
  "'sha256-armh77wyJDtOPaf8Ncgk1O05M9FtdhAsZlc3sQ3tmyM='",
]);

// Only these HTML handlers own their response CSP; other API policies stay global.
export const documentCspHeaderSource = "/:path((?!api/(?:certificates/generate|warranties/[^/]+/certificate|v1/warranties/verify/[^/]+/certificate)/?$).*)";
