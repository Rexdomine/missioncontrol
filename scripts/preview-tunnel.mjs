import { access } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const originUrl = process.argv[2] ?? "http://127.0.0.1:3000";
const readinessDeadlineMs = 120_000;
const readinessTimeoutMs = 45_000;
const externalDeadlineMs = 120_000;

async function fileExists(targetPath) {
  try {
    await access(targetPath, constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestText(url, timeoutMs) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    redirect: "follow",
  });
  const body = await response.text();
  return { response, body };
}

async function waitForOrigin(url) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < readinessDeadlineMs) {
    try {
      const { response, body } = await requestText(url, readinessTimeoutMs);
      if (response.ok && body.trim().length > 0) {
        console.log(`Origin ready at ${url} (${response.status})`);
        return;
      }

      console.log(`Origin responded with ${response.status}; waiting for a healthy page...`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.log(`Origin not ready yet (${detail})`);
    }

    await sleep(2_000);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function resolveTunnelCommand() {
  const localBinary = path.join(process.cwd(), "node_modules", ".bin", "cloudflared");
  if (await fileExists(localBinary)) {
    return { command: localBinary, args: [] };
  }

  return { command: "npx", args: ["--yes", "cloudflared"] };
}

async function verifyExternalUrl(url) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < externalDeadlineMs) {
    try {
      const { response, body } = await requestText(url, 15_000);
      if (response.ok && body.includes("Mission Control")) {
        console.log(`Verified preview URL: ${url}`);
        return true;
      }

      console.log(`Preview URL returned ${response.status}; waiting for propagation...`);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      console.log(`Preview URL not ready yet (${detail})`);
    }

    await sleep(2_000);
  }

  console.warn(
    `Preview URL emitted but could not be verified from this machine within ${
      externalDeadlineMs / 1000
    }s: ${url}`,
  );
  return false;
}

async function main() {
  await waitForOrigin(originUrl);

  const { command, args } = await resolveTunnelCommand();
  const child = spawn(
    command,
    [...args, "tunnel", "--no-autoupdate", "--url", originUrl],
    {
      stdio: ["inherit", "pipe", "pipe"],
      env: process.env,
    },
  );

  let tunnelUrlSeen = false;
  let buffer = "";

  const handleChunk = async (chunk, stream) => {
    const text = chunk.toString();
    stream.write(text);
    buffer += text;

    if (tunnelUrlSeen) {
      return;
    }

    const match = buffer.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (!match) {
      if (buffer.length > 8000) {
        buffer = buffer.slice(-4000);
      }
      return;
    }

    tunnelUrlSeen = true;
    await verifyExternalUrl(match[0]);
  };

  child.stdout.on("data", (chunk) => {
    handleChunk(chunk, process.stdout).catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
  });

  child.stderr.on("data", (chunk) => {
    handleChunk(chunk, process.stderr).catch((error) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
  });

  let shuttingDown = false;
  const signals = ["SIGINT", "SIGTERM"];
  for (const signal of signals) {
    process.on(signal, () => {
      shuttingDown = true;
      if (!child.killed) {
        child.kill(signal);
      }
    });
  }

  await new Promise((resolve, reject) => {
    child.on("exit", (code, signal) => {
      if (signal) {
        if (shuttingDown) {
          resolve();
          return;
        }

        reject(new Error(`Tunnel process exited from ${signal}`));
        return;
      }

      if (code && code !== 0) {
        reject(new Error(`Tunnel process exited with code ${code}`));
        return;
      }

      resolve();
    });

    child.on("error", reject);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
