import { access, rename } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

function formatTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    "-",
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join("");
}

async function exists(targetPath) {
  try {
    await access(targetPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const rootDir = process.cwd();
  const nextDir = path.join(rootDir, ".next");

  if (!(await exists(nextDir))) {
    return;
  }

  let backupDir = path.join(
    rootDir,
    `.next.stale-${formatTimestamp(new Date())}`,
  );
  let suffix = 0;

  while (await exists(backupDir)) {
    suffix += 1;
    backupDir = path.join(
      rootDir,
      `.next.stale-${formatTimestamp(new Date())}-${suffix}`,
    );
  }

  await rename(nextDir, backupDir);
  console.log(`Rotated stale Next runtime output to ${path.basename(backupDir)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
