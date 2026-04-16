import { createLocalAccessClient } from "@aria/access-client/local";

/** Create a tRPC client connected to the local Engine */
export function createTuiClient() {
  return createLocalAccessClient();
}
