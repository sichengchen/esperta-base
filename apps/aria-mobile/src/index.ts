import {
  ariaMobileApp,
  ariaMobileActionSections,
  ariaMobileDetailPresentations,
  ariaMobileTabs,
  type AriaMobileBootstrap,
  type AriaMobileShellInitialThread,
} from "@aria/mobile";
import type { AccessClientTarget } from "@aria/access-client";
import {
  ariaMobileAppModel,
  ariaMobileNavigation,
  createAriaMobileAppShell,
  type AriaMobileAppShell,
  type AriaMobileNavigation,
  type AriaMobileNavigationSpace,
  type AriaMobileNavigationSpaceScreen,
} from "./app.js";

export {
  ariaMobileAppModel,
  ariaMobileNavigation,
  createAriaMobileAppShell,
  type AriaMobileAppShell,
  type AriaMobileNavigation,
  type AriaMobileNavigationSpace,
  type AriaMobileNavigationSpaceScreen,
};

export * from "@aria/mobile";

export const ariaMobileHost = {
  id: "aria-mobile",
  packageName: "aria-mobile",
  displayName: "Aria Mobile",
  surface: "mobile",
  shellPackage: "@aria/mobile",
  sharedPackages: ariaMobileApp.sharedPackages,
  capabilities: ariaMobileApp.capabilities,
  navigation: ariaMobileNavigation,
  tabs: ariaMobileTabs,
  detailPresentations: ariaMobileDetailPresentations,
  actionSections: ariaMobileActionSections,
} as const;

export interface AriaMobileHostBootstrap {
  host: typeof ariaMobileHost;
  shell: typeof ariaMobileApp;
  appShell: ReturnType<typeof createAriaMobileAppShell>;
  bootstrap: AriaMobileBootstrap;
}

export function createAriaMobileHostBootstrap(
  target: AccessClientTarget,
  initialThread?: AriaMobileShellInitialThread,
): AriaMobileHostBootstrap {
  const appShell = createAriaMobileAppShell({
    target,
    initialThread,
  });

  return {
    host: ariaMobileHost,
    shell: ariaMobileApp,
    appShell,
    bootstrap: appShell,
  };
}
