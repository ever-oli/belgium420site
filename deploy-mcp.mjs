#!/usr/bin/env node
/** Deploy belgium420-site to Hostinger via MCP HTTP transport */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/http.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const TOKEN = "5C4GcGnSd2BNdF8VVNikUFGCMyyHzTcgzsfXDeWo30c28a1e";
const ARCHIVE = "/Users/ever/belgium420-site/deploy.zip";
const DOMAIN = "belgium420.com";

async function main() {
  // Try HTTP transport first
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:8100"),
    {
      headers: {
        "Accept": "application/json, text/event-stream",
        "Content-Type": "application/json"
      }
    }
  );

  const client = new Client({
    name: "deploy-script",
    version: "1.0"
  });

  try {
    await client.connect(transport);
    console.log("Connected to MCP HTTP server");

    // List tools
    const tools = await client.listTools();
    const deployTools = tools.tools?.filter(t => t.name.includes("deployStatic") || t.name.includes("StaticWebsite")) || [];
    console.log("Deploy tools:", deployTools.map(t => t.name));

    // Call deploy
    console.log(`\nDeploying ${ARCHIVE} to ${DOMAIN}...`);
    const result = await client.callTool({
      name: "hosting_deployStaticWebsite",
      arguments: {
        domain: DOMAIN,
        archivePath: ARCHIVE,
        removeArchive: true
      }
    });
    console.log("Deploy result:", JSON.stringify(result, null, 2).substring(0, 500));

    await client.close();
  } catch(e) {
    console.error("HTTP failed, trying stdio:", e.message);

    // Fall back to stdio
    const stdioTransport = new StdioClientTransport({
      command: "hostinger-api-mcp",
      env: { HOSTINGER_API_TOKEN: TOKEN },
      cwd: "/Users/ever/belgium420-site"
    });

    const stdioClient = new Client({
      name: "deploy-script",
      version: "1.0"
    });

    await stdioClient.connect(stdioTransport);
    console.log("Connected via stdio");

    console.log(`Deploying ${ARCHIVE} to ${DOMAIN}...`);
    const result = await stdioClient.callTool({
      name: "hosting_deployStaticWebsite",
      arguments: {
        domain: DOMAIN,
        archivePath: ARCHIVE,
        removeArchive: true
      }
    });
    console.log("Deploy result:", JSON.stringify(result, null, 2).substring(0, 500));
    await stdioClient.close();
  }
}

main().catch(console.error);
