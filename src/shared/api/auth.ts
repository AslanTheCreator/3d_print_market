import axios, { AxiosError } from "axios";
import config from "../config/api";

export async function loginUser(
  login: string,
  password: string
): Promise<{ accessToken: string; refreshToken: string }> {
  try {
    const { data } = await axios.post(`${config.apiBaseUrl}/auth/login`, {
      login,
      password,
    });
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error(
      "Authentication failed:",
      axiosError.response?.data || axiosError.message
    );
    throw axiosError;
  }
}

export async function refreshToken(refreshToken: string): Promise<string> {
  try {
    const { data } = await axios.post(
      `${config.apiBaseUrl}/auth/refresh`,
      null,
      {
        headers: {
          "X-Refresh-Token": refreshToken,
        },
      }
    );

    return data;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error(
      "Token refresh failed:",
      axiosError.response?.data || axiosError.message
    );
    throw axiosError;
  }
}
