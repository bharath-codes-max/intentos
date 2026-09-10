import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import { checkRoute } from "./routes/check.js";
import { orgsRoutes } from "./routes/orgs.js";
import { tokensRoutes } from "./routes/tokens.js";
import { policiesRoutes } from "./routes/policies.js";
import { decisionsRoutes } from "./routes/decisions.js";
import { approvalsRoutes } from "./routes/approvals.js";
import { compileIntentRoutes } from "./routes/compile-intent.js";
import { contractsRoutes } from "./routes/contracts.js";
import { runsRoutes } from "./routes/runs.js";
import { activityRoutes } from "./routes/activity.js";
import { authRoutes } from "./routes/auth.js";
import { devicesRoutes } from "./routes/devices.js";
import { invitesRoutes } from "./routes/invites.js";
import { employeesRoutes } from "./routes/employees.js";
import { scopeRoutes } from "./routes/scope.js";

const app = Fastify({
  logger: {
    transport: { target: "pino-pretty" },
  },
});

const allowedOrigins = [
  "http://localhost:3000",
  "https://intentos-ecru.vercel.app",
];

await app.register(cors, {
  origin: (origin, cb) => {
    // No Origin header (curl, server-to-server, Codex hooks) — not a browser CORS request.
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    try {
      // Vercel preview deployments (project-git-branch-*.vercel.app).
      if (new URL(origin).hostname.endsWith(".vercel.app")) return cb(null, true);
    } catch {
      // fall through to reject
    }
    cb(new Error("Not allowed by CORS"), false);
  },
});
await app.register(checkRoute);
await app.register(orgsRoutes);
await app.register(tokensRoutes);
await app.register(policiesRoutes);
await app.register(decisionsRoutes);
await app.register(approvalsRoutes);
await app.register(compileIntentRoutes);
await app.register(contractsRoutes);
await app.register(runsRoutes);
await app.register(activityRoutes);
await app.register(authRoutes);
await app.register(devicesRoutes);
await app.register(invitesRoutes);
await app.register(employeesRoutes);
await app.register(scopeRoutes);

app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT) || 4000;
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
