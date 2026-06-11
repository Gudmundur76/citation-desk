import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import compression from "compression";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { registerExternalProxy } from "../externalProxy";
import { registerOaiPmh } from "../oaiPmh";
import { registerAgentHeaders } from "../agentHeaders";
import { registerMagicLinkRoutes } from "../magicLink";
import { claimDigestHandler } from "../scheduledClaimDigest";
import { warmupHandler } from "../warmup";
import { registerLlmsFullTxt } from "../llmsFullTxt";
import { registerRssFeed } from "../rssFeed";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Gzip/Brotli compression — reduces 363kb HTML payload significantly
  app.use(compression({
    level: 6,
    threshold: 1024, // only compress responses > 1kb
    filter: (req, res) => {
      // Don't compress SSE streams
      if (req.headers.accept?.includes('text/event-stream')) return false;
      return compression.filter(req, res);
    },
  }));

  // Cache-Control for static assets (JS/CSS/fonts get long-lived cache via Vite content hashing)
  app.use((req, res, next) => {
    const url = req.url;
    // Vite-hashed assets: immutable cache
    if (url.startsWith('/assets/') && (url.includes('.js') || url.includes('.css') || url.includes('.woff'))) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Well-known files: short cache
    else if (url.startsWith('/.well-known/') || url === '/llms.txt' || url === '/robots.txt' || url === '/sitemap.xml') {
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
    }
    next();
  });

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  registerMagicLinkRoutes(app);
  registerExternalProxy(app);
  registerOaiPmh(app);
  registerLlmsFullTxt(app);
  registerRssFeed(app);
  registerAgentHeaders(app);
  // Heartbeat scheduled handlers — must be before tRPC and Vite fallthrough
  app.post("/api/scheduled/claimDigest", claimDigestHandler);
  app.post("/api/scheduled/warmup", warmupHandler);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
