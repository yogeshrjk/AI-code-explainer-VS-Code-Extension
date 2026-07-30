import assert from "node:assert/strict";
import test from "node:test";
import {
  scheduleLatestRender,
  type VersionedRenderState
} from "../webview/renderCoordinator.ts";

function createState(): VersionedRenderState {
  return {
    renderVersion: 0,
    renderBusy: false,
    renderQueued: false
  };
}

void test("a stale asynchronous render cannot overwrite a newer render", async () => {
  const state = createState();
  const commits: string[] = [];
  let releaseFirstRender: (() => void) | undefined;
  const firstRenderBlocked = new Promise<void>((resolve) => {
    releaseFirstRender = resolve;
  });

  const first = scheduleLatestRender(
    state,
    async (version) => {
      await firstRenderBlocked;
      return `render-${version}`;
    },
    (result) => commits.push(result)
  );

  const second = scheduleLatestRender(
    state,
    (version) => Promise.resolve(`render-${version}`),
    (result) => commits.push(result)
  );

  releaseFirstRender?.();
  await Promise.all([first, second]);
  assert.deepEqual(commits, ["render-2"]);
});

void test("independent messages render concurrently without sharing state", async () => {
  const firstState = createState();
  const secondState = createState();
  const commits: string[] = [];

  await Promise.all([
    scheduleLatestRender(
      firstState,
      () => Promise.resolve("first"),
      (result) => commits.push(result)
    ),
    scheduleLatestRender(
      secondState,
      () => Promise.resolve("second"),
      (result) => commits.push(result)
    )
  ]);

  assert.deepEqual(new Set(commits), new Set(["first", "second"]));
});
