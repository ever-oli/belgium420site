#!/usr/bin/env node
// Deploy via MCP stdio transport
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const TOKEN = process.env.HOSTINGER_API_TOKEN || "5C4GcGnSd2BNdF8VVNikUFGCMyyHzTcgzsfXDeWo30c28a1e";
const ARCHIVE = "/Users/ever/belgium420-site/deploy.zip";
const DOMAIN = "belgium420.com";

const transport = new StdioClientTransport({
  command: "hostinger-api-mcp",
  env: { HOSTINGER_API_TOKEN: TOKEN },
  cwd: "/Users/ever/belgium420-site"
});

const client = new Client({ name: "deploy", version: "1.0" });
await client.connect(transport);
console.log("✅ Connected to Hostinger MCP");

// List tools to verify
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
