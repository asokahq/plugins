declare module 'claude-code' {
  interface PluginState {
    asoka: {
      // Open Asoka requests this session watches, by request_id.
      watched: Record<
        string,
        { title: string; after: string | null; status: string; openedAtMs: number; lastLine: string }
      >
      // Wake-ups Claude has not read yet, by request_id.
      wakes: Record<string, { title: string; after: string | null }>
    }
  }
}
