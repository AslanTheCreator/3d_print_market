import { expect, test } from "@playwright/test";
import { authApi, useAuthStore } from "@/entities/session";

test("admin identity survives token refresh but changes on new account", async () => {
  const initial = useAuthStore.getState();
  const refresh = authApi.refreshAccessToken;
  const login = authApi.loginUser;
  authApi.refreshAccessToken = async () => "fixture-access";
  authApi.loginUser = async () => true;
  try {
    useAuthStore.setState({ isAuthenticated: true, isInitialized: true, accountRevision: 10, sessionRevision: 20 });
    await useAuthStore.getState().refreshToken();
    expect(useAuthStore.getState().accountRevision).toBe(10);
    expect(useAuthStore.getState().sessionRevision).toBe(21);
    await useAuthStore.getState().login("fixture@example.test", "fixture-password");
    expect(useAuthStore.getState().accountRevision).toBe(11);
  } finally { authApi.refreshAccessToken = refresh; authApi.loginUser = login; useAuthStore.setState(initial, true); }
});
