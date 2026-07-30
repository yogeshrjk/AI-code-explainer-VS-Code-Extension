export interface VersionedRenderState {
  renderVersion: number;
  renderBusy: boolean;
  renderQueued: boolean;
}

export async function scheduleLatestRender<T>(
  state: VersionedRenderState,
  build: (version: number) => Promise<T>,
  commit: (result: T, version: number) => void
): Promise<void> {
  state.renderVersion += 1;
  state.renderQueued = true;

  if (state.renderBusy) {
    return;
  }

  state.renderBusy = true;
  try {
    while (state.renderQueued) {
      state.renderQueued = false;
      const version = state.renderVersion;
      const result = await build(version);
      if (version === state.renderVersion) {
        commit(result, version);
      }
    }
  } finally {
    state.renderBusy = false;
  }
}
