#!/usr/bin/env bun
/**
 * Updates the Homebrew tap formula with the current version and checksums.
 *
 * Reads checksums from local artifact files (downloaded by the release workflow),
 * clones the tap repo, updates the formula, commits, and pushes.
 *
 * Requires:
 *   TAP_GITHUB_TOKEN env var — a GitHub PAT with repo scope for the tap repo
 *
 * Usage (called by .github/workflows/release.yml):
 *   bun run scripts/update-homebrew.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";

const TAP_REPO = "sichengchen/homebrew-tap";
const FORMULA_PATH = "Formula/sa.rb";
const SA_REPO = "sichengchen/sa";

// Read version from package.json
const pkgPath = resolve(import.meta.dir, "..", "package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const version = pkg.version as string;

// Read checksums from local artifact files
function readChecksum(filename: string): string {
  const content = readFileSync(
    resolve(import.meta.dir, "..", "artifacts", filename),
    "utf-8",
  );
  return content.trim().split(/\s+/)[0];
}

const armSha = readChecksum("sa-darwin-arm64.sha256");
const intelSha = readChecksum("sa-darwin-x86_64.sha256");

console.log(`Version: ${version}`);
console.log(`ARM64 SHA256: ${armSha}`);
console.log(`x86_64 SHA256: ${intelSha}`);

// Generate formula content
const formula = `class Sa < Formula
  desc "Personal AI agent assistant"
  homepage "https://github.com/${SA_REPO}"
  version "${version}"
  license "MIT"

  on_arm do
    url "https://github.com/${SA_REPO}/releases/download/v${version}/sa-darwin-arm64"
    sha256 "${armSha}"
  end

  on_intel do
    url "https://github.com/${SA_REPO}/releases/download/v${version}/sa-darwin-x86_64"
    sha256 "${intelSha}"
  end

  depends_on "bun"

  def install
    binary = Dir["sa-darwin-*"].first
    bin.install binary => "sa"
  end

  test do
    assert_match version.to_s, shell_output("\#{bin}/sa --version 2>&1", 1)
  end
end
`;

// Clone tap, update formula, commit, push
const token = process.env.TAP_GITHUB_TOKEN;
if (!token) {
  console.error("Error: TAP_GITHUB_TOKEN env var is required");
  process.exit(1);
}

const tmpDir = `/tmp/homebrew-tap-${Date.now()}`;
const cloneUrl = `https://x-access-token:${token}@github.com/${TAP_REPO}.git`;

execSync(`git clone --depth 1 ${cloneUrl} ${tmpDir}`, { stdio: "inherit" });
execSync(`mkdir -p ${tmpDir}/Formula`, { stdio: "inherit" });

const formulaPath = resolve(tmpDir, FORMULA_PATH);
Bun.write(formulaPath, formula);

execSync(
  `cd ${tmpDir} && git add Formula/sa.rb && git commit -m "sa ${version}" && git push`,
  { stdio: "inherit" },
);

// Cleanup
execSync(`rm -rf ${tmpDir}`);

console.log(`\nHomebrew formula updated to ${version}`);
