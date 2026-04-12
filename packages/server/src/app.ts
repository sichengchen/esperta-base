import { startServer, type EngineServer, type EngineServerOptions } from "@aria/gateway/server";
import { createRuntime, type EngineRuntime } from "@aria/runtime/runtime";

export interface AriaServerFactories {
  createRuntime?: () => Promise<EngineRuntime>;
  startServer?: (runtime: EngineRuntime, options?: EngineServerOptions) => Promise<EngineServer>;
}

export interface StartAriaServerOptions extends EngineServerOptions {
  factories?: AriaServerFactories;
}

export interface AriaServerApp {
  runtime: EngineRuntime;
  server: EngineServer;
  stop(): Promise<void>;
}

export async function startAriaServer(options: StartAriaServerOptions = {}): Promise<AriaServerApp> {
  const { factories, ...serverOptions } = options;
  const createRuntimeImpl = factories?.createRuntime ?? createRuntime;
  const startServerImpl = factories?.startServer ?? startServer;
  const runtime = await createRuntimeImpl();

  try {
    const server = await startServerImpl(runtime, serverOptions);
    return {
      runtime,
      server,
      async stop(): Promise<void> {
        await server.stop();
      },
    };
  } catch (error) {
    await runtime.close();
    throw error;
  }
}
