import {
  buildAccessClientConfig,
  type AccessClientTarget,
} from "@aria/access-client";
import {
  createProjectThreadListItem,
  type ProjectThreadListItem,
} from "@aria/ui";
import type { ProjectRecord, ThreadRecord } from "@aria/projects";

export const ariaMobileApp = {
  id: "aria-mobile",
  displayName: "Aria Mobile",
  surface: "mobile",
  sharedPackages: [
    "@aria/access-client",
    "@aria/ui",
    "@aria/projects",
    "@aria/protocol",
  ],
  capabilities: ["server-access", "project-threads", "remote-review"],
} as const;

export interface AriaMobileBootstrap {
  app: typeof ariaMobileApp;
  access: ReturnType<typeof buildAccessClientConfig>;
  initialThread?: ProjectThreadListItem;
}

export function createAriaMobileBootstrap(
  target: AccessClientTarget,
  initialThread?: {
    project: Pick<ProjectRecord, "name">;
    thread: Pick<ThreadRecord, "threadId" | "title" | "status">;
  },
): AriaMobileBootstrap {
  return {
    app: ariaMobileApp,
    access: buildAccessClientConfig(target),
    initialThread: initialThread
      ? createProjectThreadListItem(initialThread.project, initialThread.thread)
      : undefined,
  };
}
