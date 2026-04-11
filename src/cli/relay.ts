import { join } from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { CLI_NAME, getRuntimeHome } from "@aria/shared/brand.js";
import type { RelayDeviceRecord } from "../../packages/relay/src/types.js";

const RELAY_STORE_FILE = "relay.devices.json";

async function loadDevices(): Promise<RelayDeviceRecord[]> {
  const path = join(getRuntimeHome(), RELAY_STORE_FILE);
  if (!existsSync(path)) {
    return [];
  }
  return JSON.parse(await readFile(path, "utf-8")) as RelayDeviceRecord[];
}

async function saveDevices(devices: RelayDeviceRecord[]): Promise<void> {
  const home = getRuntimeHome();
  await mkdir(home, { recursive: true });
  await writeFile(join(home, RELAY_STORE_FILE), JSON.stringify(devices, null, 2) + "\n");
}

function printHelp(): void {
  console.log(`Usage: ${CLI_NAME} relay <list|register <deviceId> <label>|revoke <deviceId>>`);
}

export async function relayCommand(args: string[]): Promise<void> {
  const action = args[0] ?? "list";
  if (action === "--help" || action === "-h" || action === "help") {
    printHelp();
    return;
  }

  const devices = await loadDevices();

  if (action === "list") {
    if (devices.length === 0) {
      console.log("No relay devices registered.");
      return;
    }
    for (const device of devices) {
      console.log(`${device.deviceId}  ${device.label}  paired=${new Date(device.pairedAt).toISOString()}  revoked=${device.revokedAt ? new Date(device.revokedAt).toISOString() : "no"}`);
    }
    return;
  }

  if (action === "register") {
    const [deviceId, ...labelParts] = args.slice(1);
    const label = labelParts.join(" ").trim();
    if (!deviceId || !label) {
      printHelp();
      process.exitCode = 1;
      return;
    }
    const existing = devices.find((device) => device.deviceId === deviceId);
    const next = existing
      ? devices.map((device) => device.deviceId === deviceId ? { ...device, label, revokedAt: null } : device)
      : [...devices, { deviceId, label, pairedAt: Date.now(), revokedAt: null }];
    await saveDevices(next);
    console.log(`Registered relay device ${deviceId}.`);
    return;
  }

  if (action === "revoke") {
    const deviceId = args[1];
    if (!deviceId) {
      printHelp();
      process.exitCode = 1;
      return;
    }
    const next = devices.map((device) => device.deviceId === deviceId ? { ...device, revokedAt: Date.now() } : device);
    await saveDevices(next);
    console.log(`Revoked relay device ${deviceId}.`);
    return;
  }

  printHelp();
  process.exitCode = 1;
}
