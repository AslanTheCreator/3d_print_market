export interface AuthSessionAdapter {
  refreshAccessToken(): Promise<boolean>;
  onSessionExpired(): void;
}

let authSessionAdapter: AuthSessionAdapter | null = null;

export const registerAuthSessionAdapter = (
  adapter: AuthSessionAdapter,
): (() => void) => {
  authSessionAdapter = adapter;

  return () => {
    if (authSessionAdapter === adapter) {
      authSessionAdapter = null;
    }
  };
};

export const getAuthSessionAdapter = (): AuthSessionAdapter | null =>
  authSessionAdapter;
