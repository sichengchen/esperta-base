import {
  resolveHostAccessClientTarget,
  type AccessClientTarget,
  type AriaChatController,
  type AriaChatState,
} from "@aria/access-client";
import { createAriaMobileNativeHostModel, type AriaMobileNativeHostModel } from "./native-model.js";
import {
  createAriaMobileAppShell,
  startAriaMobileNativeHostShell,
  type AriaMobileAppShell,
} from "./app.js";

export function resolveAriaMobileNativeHostTarget(
  config: Partial<AccessClientTarget> | undefined,
): AccessClientTarget {
  return resolveHostAccessClientTarget(config, {
    serverId: "mobile",
    baseUrl: "http://127.0.0.1:7420/",
  });
}

export interface AriaMobileNativeHostBootstrap {
  target: AccessClientTarget;
  shell: AriaMobileAppShell;
  model: AriaMobileNativeHostModel;
}

export interface AriaMobileNativeHostBootstrapOptions extends Partial<AccessClientTarget> {
  ariaThreadController?: AriaChatController;
  ariaThreadState?: AriaChatState;
}

export function createAriaMobileNativeHostBootstrap(
  config?: AriaMobileNativeHostBootstrapOptions,
): AriaMobileNativeHostBootstrap {
  const target = resolveAriaMobileNativeHostTarget(config);
  const shell = createAriaMobileAppShell({
    target,
    ariaThreadController: config?.ariaThreadController,
    ariaThreadState: config?.ariaThreadState,
  });
  return {
    target,
    shell,
    model: createAriaMobileNativeHostModel(shell),
  };
}

export async function startAriaMobileNativeHostBootstrap(
  config?: AriaMobileNativeHostBootstrapOptions,
): Promise<AriaMobileNativeHostBootstrap> {
  const target = resolveAriaMobileNativeHostTarget(config);
  const shell = await startAriaMobileNativeHostShell({
    target,
    ariaThreadController: config?.ariaThreadController,
    ariaThreadState: config?.ariaThreadState,
  });
  return {
    target,
    shell,
    model: createAriaMobileNativeHostModel(shell),
  };
}
