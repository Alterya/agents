const fs = require('fs');
const path = require('path');

function parseEnv(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1);
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function main() {
  const envPath = process.argv[2];
  if (!envPath) {
    console.error('Usage: node scripts/update_mcp_keys.js /absolute/path/to/.env');
    process.exit(1);
  }
  if (!fs.existsSync(envPath)) {
    console.error('Env file not found:', envPath);
    process.exit(2);
  }
  const mcpPath = path.join(process.cwd(), '.cursor', 'mcp.json');
  if (!fs.existsSync(mcpPath)) {
    console.error('MCP config not found at', mcpPath);
    process.exit(3);
  }
  const env = parseEnv(fs.readFileSync(envPath, 'utf8'));
  const j = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
  const server = j.mcpServers && j.mcpServers['task-master-ai'];
  if (!server) {
    console.error('task-master-ai server entry not found in mcp.json');
    process.exit(4);
  }
  server.env = server.env || {};
  let changed = false;
  if (env.OPENAI_API_KEY && server.env.OPENAI_API_KEY !== env.OPENAI_API_KEY) {
    server.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
    changed = true;
  }
  if (env.OPENROUTER_API_KEY && server.env.OPENROUTER_API_KEY !== env.OPENROUTER_API_KEY) {
    server.env.OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
    changed = true;
  }
  if (changed) {
    fs.writeFileSync(mcpPath, JSON.stringify(j, null, 2));
    console.log('Updated .cursor/mcp.json with keys.');
  } else {
    console.log('No changes applied (keys missing or already set).');
  }
}

main();


