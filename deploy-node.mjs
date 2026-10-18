#!/usr/bin/env node
// Deploy dist/ as a static website to belgium420.com via the Hostinger API MCP server.
// Prereqs: 1) npm run build  2) cd dist && zip -rq ../deploy.zip .
// Token: export HOSTINGER_API_TOKEN="hp_..." (get it in hPanel → API → Generate token)
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const TOKEN = process.env.HOSTINGER_API_TOKEN;
if (!TOKEN) {
  console.error("Missing HOSTINGER_API_TOKEN env var (hPanel → API → Generate new token, starts with hp_)");
  process.exit(1);
}
const root = path.dirname(fileURLToPath(import.meta.url));
const ARCHIVE = process.env.DEPLOY_ARCHIVE || path.join(root, "deploy.zip");
const DOMAIN = process.env.DEPLOY_DOMAIN || "belgium420.com";

const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "hostinger-api-mcp"],
  env: { ...process.env, HOSTINGER_API_TOKEN: TOKEN },
  cwd: root,
});

const client = new Client({ name: "deploy", version: "1.0" });
await client.connect(transport);
console.log("✅ Connected to Hostinger MCP");

const tools = await client.listTools();
const deployTool = tools.tools?.find(t => t.name === "hosting_deployStaticWebsite");
console.log(`Found tool: ${deployTool?.name || "NOT FOUND"}`);

console.log(`\n🚀 Deploying ${ARCHIVE} to ${DOMAIN}...`);
const result = await client.callTool({
  name: "hosting_deployStaticWebsite",
  arguments: {
    domain: DOMAIN,
    archivePath: ARCHIVE,
    removeArchive: true
  }
});
console.log("Response:", JSON.stringify(result.content || result, null, 2).substring(0, 500));
await client.close();
console.log("\n✅ Deploy complete");
