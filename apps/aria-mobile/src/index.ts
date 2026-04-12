import {
  ariaMobileApp,
  ariaMobileActionSections,
  ariaMobileDetailPresentations,
  ariaMobileTabs,
  createAriaMobileBootstrap,
  type AriaMobileBootstrap,
  type AriaMobileShellInitialThread,
} from "@aria/mobile";
import type { AccessClientTarget } from "@aria/access-client";

export * from "@aria/mobile";

export const ariaMobileHost = {
  id: "aria-mobile",
  packageName: "aria-mobile",
  displayName: "Aria Mobile",
  surface: "mobile",
  shellPackage: "@aria/mobile",
  sharedPackages: ariaMobileApp.sharedPackages,
  capabilities: ariaMobileApp.capabilities,
  tabs: ariaMobileTabs,
  detailPresentations: ariaMobileDetailPresentations,
  actionSections: ariaMobileActionSections,
} as const;

export interface AriaMobileHostBootstrap {
  host: typeof ariaMobileHost;
  shell: typeof ariaMobileApp;
  bootstrap: AriaMobileBootstrap;
}

export function createAriaMobileHostBootstrap(
  target: AccessClientTarget,
  initialThread?: AriaMobileShellInitialThread,
): AriaMobileHostBootstrap {
  return {
    host: ariaMobileHost,
    shell: ariaMobileApp,
    bootstrap: createAriaMobileBootstrap(target, initialThread),
  };
}
