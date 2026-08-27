#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import prompts from "prompts";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, "..", "templates");
const REPO_URL = "https://github.com/archlynx/admin-panel.git";
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

// Reads the version already installed in the host project's node_modules,
// if any. Returns null if the package isn't installed at all.
function getInstalledVersion(pkgName) {
  try {
    const pkgJsonPath = path.join(CWD, "node_modules", pkgName, "package.json");
    if (!fs.existsSync(pkgJsonPath)) return null;
    const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, "utf-8"));
    return pkgJson.version || null;
  } catch {
    return null;
  }
}

// Also check the host's own package.json dependencies/devDependencies,
// in case it's declared but node_modules wasn't inspected/installed yet
// in a way getInstalledVersion would catch.
function isDeclaredInPackageJson(pkgName) {
  try {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(CWD, "package.json"), "utf-8"));
    return Boolean(
      pkgJson.dependencies?.[pkgName] ||
      pkgJson.devDependencies?.[pkgName] ||
      pkgJson.peerDependencies?.[pkgName]
    );
  } catch {
    return false;
  }
}

async function main() {
  console.log("\n📦 Installing admin panel...\n");

  // 1. Clone the source repo into a temp dir
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "admin-panel-"));
  console.log("Cloning admin source...");
  run(`git clone --depth 1 ${REPO_URL} "${tmpDir}"`, { cwd: tmpDir });

  const sourcePackageDir = path.join(tmpDir, "packages", "admin");
  if (!fs.existsSync(sourcePackageDir)) {
    console.error("Could not find packages/admin in the cloned repo. Aborting.");
    process.exit(1);
  }

  // 2. Copy packages/admin into the target project — plain folder copy,
  // no workspace registration. Just files on disk, imported by relative
  // path from wherever the app mounts the admin panel.
  const targetPackageDir = path.join(CWD, "packages", "admin");
  fs.mkdirSync(path.join(CWD, "packages"), { recursive: true });

  if (fs.existsSync(targetPackageDir)) {
    const { overwritePkg } = await prompts({
      type: "confirm",
      name: "overwritePkg",
      message: "packages/admin already exists. Overwrite it?",
      initial: false,
    });
    if (overwritePkg) {
      fs.rmSync(targetPackageDir, { recursive: true, force: true });
      fs.cpSync(sourcePackageDir, targetPackageDir, { recursive: true });
      console.log("Replaced packages/admin.");
    } else {
      console.log("Skipped copying packages/admin (kept your existing copy).");
    }
  } else {
    fs.cpSync(sourcePackageDir, targetPackageDir, { recursive: true });
    console.log("Copied packages/admin.");
  }

  // 3. Sanity-check the target project
  if (!fileExists("package.json")) {
    console.error(
      "No package.json found in this directory.\n" +
      "Run this inside an existing Next.js project (after `npx create-next-app`)."
    );
    process.exit(1);
  }

  // 4. Install the admin panel's own runtime dependencies — but skip any
  // that are already installed (in node_modules) or already declared in
  // the host's package.json, rather than blindly reinstalling everything.
  const depsManifest = path.join(sourcePackageDir, "dependencies.json");
  if (fs.existsSync(depsManifest)) {
    const deps = JSON.parse(fs.readFileSync(depsManifest, "utf-8"));
    const toInstall = [];
    const alreadyPresent = [];

    for (const [name, version] of Object.entries(deps)) {
      const installedVersion = getInstalledVersion(name);
      if (installedVersion || isDeclaredInPackageJson(name)) {
        alreadyPresent.push(installedVersion ? `${name}@${installedVersion}` : name);
      } else {
        toInstall.push(`${name}@${version}`);
      }
    }

    if (alreadyPresent.length > 0) {
      console.log(`Already installed, skipping: ${alreadyPresent.join(", ")}`);
    }

    if (toInstall.length > 0) {
      console.log(`Installing ${toInstall.length} missing dependencies: ${toInstall.join(", ")}`);
      try {
        run(`pnpm add ${toInstall.join(" ")} --dangerously-allow-all-builds`);
      } catch {
        console.warn(
          "Could not install dependencies automatically. Run it yourself:\n" +
          `  pnpm add ${toInstall.join(" ")}`
        );
      }
    } else {
      console.log("All admin panel dependencies already present — nothing to install.");
    }
  } else {
    console.warn(
      "No dependencies.json found alongside packages/admin — skipping automatic\n" +
      "dependency check. You may need to install packages like @blocknote/core,\n" +
      "@blocknote/react, @blocknote/mantine, @mantine/core, lucide-react,\n" +
      "react-datepicker, clsx, tailwind-merge yourself."
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

  // 6. Scaffold src/app/admin/entities.js
  const entitiesTarget = "src/app/admin/entities.js";
  if (await confirmOverwrite("entities.js", entitiesTarget)) {
    fs.mkdirSync(path.join(CWD, "src", "app", "admin"), { recursive: true });
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

  // 8. Print next steps
  console.log("\n✅ Done. Still needed manually:\n");
  console.log("1. Add to your .env:");
  console.log("   NEXT_PUBLIC_API=<your API base URL>");
  console.log("   NEXT_PUBLIC_HOST=<your media/asset host>\n");
  console.log("2. Add to tailwind.config.js content array:");
  console.log('   "./packages/admin/**/*.{js,jsx}"\n');
  console.log("3. Fill in src/app/admin/entities.js with your real entities.\n");
  console.log("4. Mount it — e.g. src/app/admin/layout.js:");
  console.log('   import "@/admin.config";');
  console.log('   import { AdminProvider } from "../../../packages/admin/index.jsx";\n');
  console.log("5. pnpm run dev\n");
  console.log("Note: packages/admin is now yours to edit directly —");
  console.log("no build step, no package registration, changes show up on save.\n");
}

main().catch((err) => {
  console.error("Install failed:", err.message);
  process.exit(1);
});
