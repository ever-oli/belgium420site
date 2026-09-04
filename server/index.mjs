import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import supertokens from "supertokens-node";
import Session from "supertokens-node/recipe/session/index.js";
import EmailPassword from "supertokens-node/recipe/emailpassword/index.js";
import {
  middleware,
  errorHandler,
} from "supertokens-node/framework/express/index.js";
import { verifySession } from "supertokens-node/recipe/session/framework/express/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const websiteDomain = process.env.WEBSITE_DOMAIN || "http://localhost:4321";
const apiDomain = process.env.API_DOMAIN || "http://localhost:3001";
const port = Number(process.env.PORT || 3001);
const inviteCode = process.env.INVITE_CODE || "belgium420-ff";
const connectionURI =
  process.env.SUPERTOKENS_CONNECTION_URI || "https://try.supertokens.com";
const apiKey = process.env.SUPERTOKENS_API_KEY || undefined;

supertokens.init({
  framework: "express",
  supertokens: {
    connectionURI,
    apiKey,
  },
  appInfo: {
    appName: "Belgium420",
    apiDomain,
    websiteDomain,
    apiBasePath: "/auth",
    websiteBasePath: "/",
  },
  recipeList: [
    EmailPassword.init({
      signUpFeature: {
        formFields: [
          {
            id: "invite",
            validate: async (value) => {
              if (typeof value !== "string" || value.trim() !== inviteCode) {
                return "Invalid invite code";
              }
              return undefined;
            },
          },
        ],
      },
    }),
    Session.init(),
  ],
});

const app = express();

app.use(
  cors({
    origin: websiteDomain,
    allowedHeaders: ["content-type", ...supertokens.getAllCORSHeaders()],
    methods: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
    credentials: true,
  }),
);

app.use(middleware());

app.get("/api/session", verifySession({ sessionRequired: false }), (req, res) => {
  const session = req.session;
  if (!session) {
    return res.json({ loggedIn: false });
  }
  return res.json({
    loggedIn: true,
    userId: session.getUserId(),
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "Belgium420",
    auth: "supertokens",
    core: connectionURI,
  });
});

const distDir = path.join(root, "dist");
app.use(express.static(distDir));
app.get(/^(?!\/auth|\/api).*/, (req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") return next();
  res.sendFile(path.join(distDir, "index.html"), (err) => {
    if (err) next();
  });
});

app.use(errorHandler());

app.listen(port, () => {
  console.log(`[belgium420-auth] listening on ${apiDomain} (port ${port})`);
  console.log(`[belgium420-auth] website ${websiteDomain}`);
  console.log(`[belgium420-auth] SuperTokens core ${connectionURI}`);
});
