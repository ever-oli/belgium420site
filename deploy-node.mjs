#!/usr/bin/env node
// Deploy a prebuilt dist/ archive to belgium420.com via the Hostinger API MCP server.
// Prereqs:
//   1) AUTH_ENABLED=false npm run build
//   2) cd dist && rm -f ../deploy.zip && zip -rq ../deploy.zip . && cd ..
//   3) export HOSTINGER_API_TOKEN="hp_..."   (hPanel → Account information → API)
// Usage: node deploy-node.mjs [archivePath] [domain]
//
// The Hostinger MCP server is a gateway: `search` finds the API operation, `execute` runs it.
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import path from "node:path";

const TOKEN = process.env.HOSTINGER_API_TOKEN;
if (!TOKEN) {
  console.error("Missing HOSTINGER_API_TOKEN env var (hPanel → Account information → API).");
  process.exit(1);
}

const root = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVE = path.resolve(process.argv[2] || process.env.DEPLOY_ARCHIVE || path.join(root, "deploy.zip"));
const DOMAIN = process.argv[3] || process.env.DEPLOY_DOMAIN || "belgium420.com";
const OPERATION = process.env.DEPLOY_OPERATION || "hosting_deploy-static-website";

if (!fs.existsSync(ARCHIVE)) {
  console.error(`Archive not found: ${ARCHIVE}`);
  process.exit(1);
}
console.log(`Archive: ${ARCHIVE} (${(fs.statSync(ARCHIVE).size / 1024 / 1024).toFixed(1)} MB)`);
console.log(`Target:  ${DOMAIN} via ${OPERATION}`);

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "hostinger-api-mcp"],
  env: { ...process.env, HOSTINGER_API_TOKEN: TOKEN },
  cwd: root,
  stderr: "inherit",
});

const client = new Client({ name: "deploy", version: "1.0" });
await client.connect(transport);
console.log("✅ Connected to Hostinger MCP");

// Confirm the operation exists in the live catalog (names can change between server versions).
const search = await client.callTool({ name: "search", arguments: { query: OPERATION, limit: 5 } });
const searchText = (search.content || []).map((c) => c.text).join("\n");
if (!searchText.includes(OPERATION)) {
  console.error(`Operation ${OPERATION} not found. Search returned:\n${searchText.slice(0, 800)}`);
  process.exit(1);
}
console.log(`✅ Operation available: ${OPERATION}`);

console.log(`\n🚀 Deploying to ${DOMAIN}… (large archives can take several minutes)`);
const started = Date.now();
const result = await client.callTool({
  name: "execute",
  arguments: {
    operation: OPERATION,
    params: { domain: DOMAIN, archivePath: ARCHIVE, removeArchive: true },
  },
});
const text = (result.content || []).map((c) => c.text).join("\n");
console.log("Response:", text.slice(0, 800));
console.log(`Elapsed: ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log(result.isError ? "\n❌ Deploy reported an error" : "\n✅ Deploy complete");
await client.close();
