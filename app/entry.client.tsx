import * as Sentry from "@sentry/remix";
import { RemixBrowser, useLocation, useMatches } from "@remix-run/react";
import { startTransition, StrictMode, useEffect } from "react";
import { hydrateRoot } from "react-dom/client";

Sentry.init({
  dsn: "https://075988610087cd2a5014c2e9e8bda968@o4506520941756416.ingest.us.sentry.io/4507026429902848",
  tracesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",
  integrations: [
    Sentry.browserTracingIntegration({
      useEffect,
      useLocation,
      useMatches,
    }),
    Sentry.replayIntegration(),
  ],
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
