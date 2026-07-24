import { spawnSync } from "node:child_process";

export const CLI_PACKAGE_NAME = "warrantee";
export const CLI_VERSION = "0.1.0";
export const NPM_REGISTRY_URL = "https://registry.npmjs.org";

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/;

function parseVersion(value) {
  const match = SEMVER_PATTERN.exec(String(value || "").trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || "",
  };
}

export function compareVersions(left, right) {
  const leftVersion = parseVersion(left);
  const rightVersion = parseVersion(right);
  if (!leftVersion || !rightVersion) {
    throw new Error("Version must use semantic versioning");
  }

  for (const key of ["major", "minor", "patch"]) {
    if (leftVersion[key] !== rightVersion[key]) {
      return leftVersion[key] > rightVersion[key] ? 1 : -1;
    }
  }
  if (leftVersion.prerelease === rightVersion.prerelease) return 0;
  if (!leftVersion.prerelease) return 1;
  if (!rightVersion.prerelease) return -1;
  return leftVersion.prerelease.localeCompare(rightVersion.prerelease);
}

function validatePackageMetadata(metadata) {
  if (!metadata || typeof metadata !== "object") {
    throw new Error("npm returned invalid package metadata");
  }
  if (metadata.name !== CLI_PACKAGE_NAME || !parseVersion(metadata.version)) {
    throw new Error("npm package identity or version did not match Warrantee");
  }

  const tarball = new URL(String(metadata.dist?.tarball || ""));
  if (
    tarball.protocol !== "https:" ||
    tarball.hostname !== "registry.npmjs.org" ||
    !tarball.pathname.endsWith(`/${CLI_PACKAGE_NAME}-${metadata.version}.tgz`)
  ) {
    throw new Error("npm tarball did not come from the trusted Warrantee registry path");
  }

  if (!String(metadata.dist?.integrity || "").startsWith("sha512-")) {
    throw new Error("npm package is missing SHA-512 integrity metadata");
  }
  if (!Array.isArray(metadata.dist?.signatures) || metadata.dist.signatures.length === 0) {
    throw new Error("npm package is missing registry signatures");
  }

  return {
    name: metadata.name,
    version: metadata.version,
    tarball: tarball.toString(),
    integrity: metadata.dist.integrity,
    signatureCount: metadata.dist.signatures.length,
  };
}

export async function getUpdateStatus({
  currentVersion = CLI_VERSION,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("No fetch implementation is available");
  }

  const response = await fetchImpl(`${NPM_REGISTRY_URL}/${CLI_PACKAGE_NAME}/latest`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });

  if (response.status === 404) {
    return {
      package: CLI_PACKAGE_NAME,
      currentVersion,
      published: false,
      updateAvailable: false,
      registry: NPM_REGISTRY_URL,
    };
  }
  if (!response.ok) {
    throw new Error(`npm registry check failed with status ${response.status}`);
  }

  const verified = validatePackageMetadata(await response.json());
  return {
    package: CLI_PACKAGE_NAME,
    currentVersion,
    latestVersion: verified.version,
    published: true,
    updateAvailable: compareVersions(verified.version, currentVersion) > 0,
    registry: NPM_REGISTRY_URL,
    verification: {
      registryHost: "registry.npmjs.org",
      integrity: "sha512",
      signatures: verified.signatureCount,
    },
  };
}

export async function installVerifiedUpdate({
  currentVersion = CLI_VERSION,
  fetchImpl = globalThis.fetch,
  spawnImpl = spawnSync,
} = {}) {
  const status = await getUpdateStatus({ currentVersion, fetchImpl });
  if (!status.published) {
    throw new Error("The Warrantee CLI has not been published to npm yet");
  }
  if (!status.updateAvailable) {
    return { ...status, updated: false };
  }

  const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
  const result = spawnImpl(
    npmCommand,
    [
      "install",
      "--global",
      `${CLI_PACKAGE_NAME}@${status.latestVersion}`,
      "--ignore-scripts",
      `--registry=${NPM_REGISTRY_URL}`,
    ],
    { stdio: "inherit", shell: false }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm exited with status ${result.status ?? "unknown"}`);
  }

  return { ...status, updated: true };
}
