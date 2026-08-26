#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import prompts from "prompts";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "..", "templates");
const REPO_URL = "https://github.com/dishanshakya/admin-panel.git";
const CWD = process.cwd();

function run(cmd, opts = {}) {
  execSync(cmd, { stdio: "inherit", cwd: CWD, ...opts });
}

function fileExists(p) {
  return fs.existsSync(path.join(CWD, p));
}

async function confirmOverwrite(label, filePath) {
  if (!fileExists(filePath)) return true;
  const { overwrite } = await prompts({
    type: "confirm",
    name: "overwrite",
    message: `${label} already exists at ${filePath}. Overwrite?`,
    initial: false,
  });
  return overwrite;
}

async function main() {
  console.log("\n📦 Installing @archlynx/admin-panel...\n");

  // 1. Clone the source repo into a temp dir
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "admin-panel-"));
  console.log("Cloning admin-panel source...");
  run(`git clone --depth 1 ${REPO_URL} "${tmpDir}"`, { cwd: tmpDir });

  const sourcePackageDir = path.join(tmpDir, "packages", "admin-panel");
  if (!fs.existsSync(sourcePackageDir)) {
    console.error("Could not find packages/admin-panel in the cloned repo. Aborting.");
    process.exit(1);
  }

  // 2. Copy packages/admin-panel into the target project
  const targetPackageDir = path.join(CWD, "packages", "admin-panel");
  fs.mkdirSync(path.join(CWD, "packages"), { recursive: true });

  if (fs.existsSync(targetPackageDir)) {
    const { overwritePkg } = await prompts({
      type: "confirm",
      name: "overwritePkg",
      message: "packages/admin-panel already exists. Overwrite it?",
      initial: false,
    });
    if (overwritePkg) {
      fs.rmSync(targetPackageDir, { recursive: true, force: true });
      fs.cpSync(sourcePackageDir, targetPackageDir, { recursive: true });
      console.log("Replaced packages/admin-panel.");
    } else {
      console.log("Skipped copying packages/admin-panel (kept your existing copy).");
    }
  } else {
    fs.cpSync(sourcePackageDir, targetPackageDir, { recursive: true });
    console.log("Copied packages/admin-panel.");
  }

  // 3. Set up pnpm-workspace.yaml
  const workspaceFile = path.join(CWD, "pnpm-workspace.yaml");
  if (!fs.existsSync(workspaceFile)) {
    fs.writeFileSync(workspaceFile, `packages:\n  - "packages/*"\n`);
    console.log("Created pnpm-workspace.yaml.");
  } else {
    const content = fs.readFileSync(workspaceFile, "utf-8");
    if (!content.includes("packages/*")) {
      fs.appendFileSync(workspaceFile, `\npackages:\n  - "packages/*"\n`);
      console.log("Appended packages/* to existing pnpm-workspace.yaml.");
    } else {
      console.log("pnpm-workspace.yaml already configured.");
    }
  }

  // 4. Add @archlynx/admin-panel as a workspace dependency
  console.log("Adding @archlynx/admin-panel as a workspace dependency...");
  try {
    run(`pnpm add @archlynx/admin-panel --workspace`);
  } catch {
    console.warn(
      "Could not run `pnpm add` automatically. Run it yourself:\n" +
      "  pnpm add @archlynx/admin-panel --workspace"
    );
  }

  // 5. Scaffold admin.config.js
  const adminConfigTarget = "src/admin.config.js";
  if (await confirmOverwrite("admin.config.js", adminConfigTarget)) {
    fs.mkdirSync(path.join(CWD, "src"), { recursive: true });
    fs.copyFileSync(
      path.join(TEMPLATES_DIR, "admin.config.template.js"),
      path.join(CWD, adminConfigTarget)
    );
    console.log(`Created ${adminConfigTarget}.`);
  } else {
    console.log(`Skipped ${adminConfigTarget}.`);
  }

  // 6. Scaffold src/admin/entities.js
  const entitiesTarget = "src/admin/entities.js";
  if (await confirmOverwrite("entities.js", entitiesTarget)) {
    fs.mkdirSync(path.join(CWD, "src", "admin"), { recursive: true });
    fs.copyFileSync(
      path.join(TEMPLATES_DIR, "entities.template.js"),
      path.join(CWD, entitiesTarget)
    );
    console.log(`Created ${entitiesTarget}.`);
  } else {
    console.log(`Skipped ${entitiesTarget}.`);
  }

  // 7. Clean up temp clone
  fs.rmSync(tmpDir, { recursive: true, force: true });

  // 8. Print next steps — things the script genuinely cannot safely automate
  console.log("\n✅ Done. Manual steps still required:\n");
  console.log("1. Add to your .env:");
  console.log("   NEXT_PUBLIC_API=<your API base URL>");
  console.log("   NEXT_PUBLIC_HOST=<your media/asset host>\n");
  console.log("2. Add to tailwind.config.js content array:");
  console.log('   "./packages/admin-panel/dist/**/*.js"\n');
  console.log("3. Fill in src/admin/entities.js with your real entities.\n");
  console.log("4. Mount it — e.g. src/app/admin/layout.js:");
  console.log('   import "@/admin.config";');
  console.log('   import { AdminProvider } from "@archlynx/admin-panel";\n');
  console.log("5. pnpm i && pnpm run dev\n");
}

main().catch((err) => {
  console.error("Install failed:", err.message);
  process.exit(1);
});
