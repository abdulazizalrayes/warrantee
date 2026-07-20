import { spawn } from "node:child_process";

const port = process.env.AGENT_MARKDOWN_GATE_PORT || "3110";
const baseUrl = `http://127.0.0.1:${port}`;
const env = {
  ...process.env,
  AGENT_MARKDOWN_BASE_URL: baseUrl,
  AGENT_READINESS_BASE_URL: baseUrl,
  PORT: port,
};

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, shell: false, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function waitForServer(timeoutMs = 60_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { redirect: "manual" });
      if (response.status < 500) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${baseUrl}`);
}

const server = spawn("npm", ["run", "start"], {
  env,
  shell: false,
  stdio: "inherit",
});

let serverExitCode = null;
server.on("exit", (code) => {
  serverExitCode = code;
});

try {
  await waitForServer();
  if (serverExitCode !== null) throw new Error(`Local server exited with ${serverExitCode}`);
  await run("npm", ["run", "agent-markdown:check"]);
  await run("npm", ["run", "qa:agent-markdown"]);
  await run("npm", ["run", "qa:agent-readiness"]);
} finally {
  if (!server.killed) server.kill("SIGTERM");
}
