import { describe, expect, test } from "bun:test";
import { ChatSDKAdapter } from "../packages/connectors/src/chat-sdk/adapter.js";

async function waitFor(assertion: () => void | Promise<void>, timeoutMs = 1_000): Promise<void> {
  const startedAt = Date.now();
  let lastError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

function createFakeChat() {
  return {
    onNewMention() {},
    onSubscribedMessage() {},
    onAction() {},
  } as any;
}

function createFakeThread() {
  const posts: string[] = [];
  return {
    thread: {
      id: "thread-1",
      channelId: "channel-1",
      isDM: false,
      async post(content: string) {
        posts.push(content);
        const index = posts.length - 1;
        return {
          id: `msg-${posts.length}`,
          async edit(nextContent: string) {
            posts[index] = nextContent;
          },
        };
      },
      async subscribe() {},
    },
    posts,
  };
}

describe("ChatSDKAdapter command handling", () => {
  test("streams connector output in platform-sized chunks", async () => {
    const { thread, posts } = createFakeThread();
    const streamed = "x".repeat(4_500);
    const adapter = new ChatSDKAdapter(createFakeChat(), {
      connectorType: "discord",
      platformName: "discord",
      attributeSender: false,
    });

    (adapter as any).client = {
      session: {
        getLatest: {
          query: async () => null,
        },
        create: {
          mutate: async () => ({ session: { id: "discord:channel-1:new" } }),
        },
      },
      chat: {
        stream: {
          subscribe: (
            input: { sessionId: string; message: string },
            handlers: { onData: (event: any) => Promise<void> },
          ) => {
            expect(input).toEqual({
              sessionId: "discord:channel-1:new",
              message: "stream long output",
            });
            void handlers.onData({ type: "text_delta", delta: streamed });
            void handlers.onData({ type: "done" });
            return { unsubscribe() {} };
          },
        },
      },
    };

    await (adapter as any).handleMessage(thread, {
      text: "stream long output",
      author: { fullName: "Remote User" },
    });

    await waitFor(() => {
      expect(posts.length).toBe(3);
    });
    expect(posts.map((post) => post.length)).toEqual([2_000, 2_000, 500]);
    expect(posts.join("")).toBe(streamed);
  });

  test("passes Aria slash prompts through for gateway-level expansion", async () => {
    const { thread, posts } = createFakeThread();
    const streamed = "Planning response";
    const messages: string[] = [];
    const adapter = new ChatSDKAdapter(createFakeChat(), {
      connectorType: "discord",
      platformName: "discord",
      attributeSender: false,
    });

    (adapter as any).client = {
      session: {
        getLatest: {
          query: async () => null,
        },
        create: {
          mutate: async () => ({ session: { id: "discord:channel-1:new" } }),
        },
      },
      chat: {
        stream: {
          subscribe: (
            input: { sessionId: string; message: string },
            handlers: { onData: (event: any) => Promise<void> },
          ) => {
            messages.push(input.message);
            void handlers.onData({ type: "text_delta", delta: streamed });
            void handlers.onData({ type: "done" });
            return { unsubscribe() {} };
          },
        },
      },
    };

    await (adapter as any).handleMessage(thread, {
      text: "/plan add project labels",
      author: { fullName: "Remote User" },
    });

    await waitFor(() => {
      expect(posts).toEqual([streamed]);
    });
    expect(messages).toEqual(["/plan add project labels"]);
  });

  test("submits numbered answers for pending multiple-choice questions", async () => {
    const { thread, posts } = createFakeThread();
    const answers: Array<{ id: string; answer: string }> = [];
    const adapter = new ChatSDKAdapter(createFakeChat(), {
      connectorType: "telegram",
      platformName: "telegram",
    });

    (adapter as any).client = {
      question: {
        answer: {
          mutate: async (input: { id: string; answer: string }) => {
            answers.push(input);
          },
        },
      },
    };
    (adapter as any).pendingFreeTextQuestions.set(thread.id, "question-1");
    (adapter as any)._questionOptions = new Map([["question-1", ["red", "blue", "green"]]]);

    const handled = await (adapter as any).handleCommand(thread, "answer 2");

    expect(handled).toBe(true);
    expect(answers).toEqual([{ id: "question-1", answer: "blue" }]);
    expect(posts).toEqual(["Answer: blue"]);
    expect((adapter as any).pendingFreeTextQuestions.has(thread.id)).toBe(false);
  });

  test("submits the next connector message as a pending free-text answer", async () => {
    const { thread, posts } = createFakeThread();
    const answers: Array<{ id: string; answer: string }> = [];
    const adapter = new ChatSDKAdapter(createFakeChat(), {
      connectorType: "telegram",
      platformName: "telegram",
    });

    (adapter as any).client = {
      question: {
        answer: {
          mutate: async (input: { id: string; answer: string }) => {
            answers.push(input);
          },
        },
      },
    };
    (adapter as any).pendingFreeTextQuestions.set(thread.id, "question-2");

    const handled = await (adapter as any).handleCommand(thread, "Use the staging deploy");

    expect(handled).toBe(true);
    expect(answers).toEqual([{ id: "question-2", answer: "Use the staging deploy" }]);
    expect(posts).toEqual(["Answer: Use the staging deploy"]);
    expect((adapter as any).pendingFreeTextQuestions.has(thread.id)).toBe(false);
  });

  test("approves pending tool calls via the short text command fallback", async () => {
    const { thread, posts } = createFakeThread();
    const approvals: Array<{ toolCallId: string; approved: boolean }> = [];
    const adapter = new ChatSDKAdapter(createFakeChat(), {
      connectorType: "telegram",
      platformName: "telegram",
    });

    (adapter as any).client = {
      tool: {
        approve: {
          mutate: async (input: { toolCallId: string; approved: boolean }) => {
            approvals.push(input);
          },
        },
      },
    };
    (adapter as any).pendingApprovals.set("tool1234", "tool1234-full");

    const handled = await (adapter as any).handleCommand(thread, "approve tool1234");

    expect(handled).toBe(true);
    expect(approvals).toEqual([{ toolCallId: "tool1234-full", approved: true }]);
    expect(posts).toEqual(["Tool approved."]);
    expect((adapter as any).pendingApprovals.has("tool1234")).toBe(false);
  });

  test("rejects pending tool calls via the short text command fallback", async () => {
    const { thread, posts } = createFakeThread();
    const approvals: Array<{ toolCallId: string; approved: boolean }> = [];
    const adapter = new ChatSDKAdapter(createFakeChat(), {
      connectorType: "telegram",
      platformName: "telegram",
    });

    (adapter as any).client = {
      tool: {
        approve: {
          mutate: async (input: { toolCallId: string; approved: boolean }) => {
            approvals.push(input);
          },
        },
      },
    };
    (adapter as any).pendingApprovals.set("tool5678", "tool5678-full");

    const handled = await (adapter as any).handleCommand(thread, "reject tool5678");

    expect(handled).toBe(true);
    expect(approvals).toEqual([{ toolCallId: "tool5678-full", approved: false }]);
    expect(posts).toEqual(["Tool rejected."]);
    expect((adapter as any).pendingApprovals.has("tool5678")).toBe(false);
  });

  test("leaves unknown approval commands for normal message handling", async () => {
    const { thread, posts } = createFakeThread();
    const approvals: Array<{ toolCallId: string; approved: boolean }> = [];
    const adapter = new ChatSDKAdapter(createFakeChat(), {
      connectorType: "telegram",
      platformName: "telegram",
    });

    (adapter as any).client = {
      tool: {
        approve: {
          mutate: async (input: { toolCallId: string; approved: boolean }) => {
            approvals.push(input);
          },
        },
      },
    };

    const handled = await (adapter as any).handleCommand(thread, "approve missing");

    expect(handled).toBe(false);
    expect(approvals).toEqual([]);
    expect(posts).toEqual([]);
  });

  test("starts a new connector-scoped session from the text command path", async () => {
    const { thread, posts } = createFakeThread();
    const creates: Array<{ connectorType: string; prefix: string }> = [];
    const adapter = new ChatSDKAdapter(createFakeChat(), {
      connectorType: "telegram",
      platformName: "telegram",
    });

    (adapter as any).client = {
      session: {
        create: {
          mutate: async (input: { connectorType: string; prefix: string }) => {
            creates.push(input);
            return { session: { id: "telegram:channel-1:new" } };
          },
        },
      },
    };

    const handled = await (adapter as any).handleCommand(thread, "/new");

    expect(handled).toBe(true);
    expect(creates).toEqual([{ connectorType: "telegram", prefix: "telegram:channel-1" }]);
    expect(posts).toEqual(["New session started."]);
    expect((adapter as any).activeSessions.get(thread.id)).toBe("telegram:channel-1:new");
  });
});
