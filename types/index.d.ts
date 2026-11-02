declare module 'claude-code' {
  interface PluginState {
    asoka: {
      // Open Asoka requests this session watches, by request_id.
      watched: Record<
        string,
        { title: string; after: string | null; status: string; openedAtMs: number }
      >
    }
  }
}
