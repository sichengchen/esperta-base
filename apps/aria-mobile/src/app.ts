import {
  ariaMobileActionSections,
  ariaMobileApp,
  ariaMobileDetailPresentations,
  ariaMobileTabs,
  createAriaMobileShell,
  type AriaMobileShell,
  type CreateAriaMobileShellOptions,
} from "@aria/mobile";

export interface AriaMobileNavigationSpaceScreen {
  id: string;
  label: string;
  kind: "feed" | "list" | "thread" | "sheet";
}

export interface AriaMobileNavigationSpace {
  id: (typeof ariaMobileTabs)[number]["id"];
  label: (typeof ariaMobileTabs)[number]["label"];
  defaultScreenId: string;
  screens: readonly AriaMobileNavigationSpaceScreen[];
}

export interface AriaMobileNavigation {
  tabs: typeof ariaMobileTabs;
  spaces: readonly AriaMobileNavigationSpace[];
  detailPresentations: typeof ariaMobileDetailPresentations;
  actionSections: typeof ariaMobileActionSections;
}

export const ariaMobileNavigation = {
  tabs: ariaMobileTabs,
  spaces: [
    {
      id: "aria",
      label: "Aria",
      defaultScreenId: "chat",
      screens: [
        { id: "chat", label: "Chat", kind: "thread" },
        { id: "inbox", label: "Inbox", kind: "feed" },
        { id: "automations", label: "Automations", kind: "feed" },
        { id: "connectors", label: "Connectors", kind: "feed" },
      ],
    },
    {
      id: "projects",
      label: "Projects",
      defaultScreenId: "thread-list",
      screens: [
        { id: "thread-list", label: "Thread List", kind: "list" },
        { id: "thread", label: "Active Thread", kind: "thread" },
      ],
    },
  ],
  detailPresentations: ariaMobileDetailPresentations,
  actionSections: ariaMobileActionSections,
} as const satisfies AriaMobileNavigation;

export interface AriaMobileAppShell extends AriaMobileShell {
  navigation: typeof ariaMobileNavigation;
  layout: {
    threadListScreen: {
      placement: "stacked";
      mode: "project-first";
    };
    activeThreadScreen: {
      headerPlacement: "top";
      streamPlacement: "center";
      composerPlacement: "bottom";
      detailPresentations: typeof ariaMobileDetailPresentations;
    };
  };
}

export function createAriaMobileAppShell(
  options: CreateAriaMobileShellOptions,
): AriaMobileAppShell {
  const shell = createAriaMobileShell(options);

  return {
    ...shell,
    navigation: ariaMobileNavigation,
    layout: {
      threadListScreen: {
        placement: "stacked",
        mode: "project-first",
      },
      activeThreadScreen: {
        headerPlacement: "top",
        streamPlacement: "center",
        composerPlacement: "bottom",
        detailPresentations: ariaMobileDetailPresentations,
      },
    },
  };
}

export const ariaMobileAppModel = {
  app: ariaMobileApp,
  navigation: ariaMobileNavigation,
} as const;
