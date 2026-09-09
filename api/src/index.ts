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

const app = Fastify({
  logger: {
    transport: { target: "pino-pretty" },
  },
});

await app.register(cors, { origin: true });
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

app.get("/health", async () => ({ status: "ok" }));

const port = Number(process.env.PORT) || 4000;
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
