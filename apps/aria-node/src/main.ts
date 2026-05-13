import { RUNTIME_NAME } from "@aria/node-host/brand";
import { runAriaNodeDaemonHost } from "./index.js";

runAriaNodeDaemonHost().catch((error) => {
  console.error(`${RUNTIME_NAME} failed to start`, error);
  process.exit(1);
});
