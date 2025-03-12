import axios, { AxiosError } from "axios";
import config from "../config/api";

export async function authenticate(
  login: string,
  password: string
): Promise<string> {
  try {
    const { data } = await axios.post(`${config.apiBaseUrl}/auth/login`, {
      login,
      password,
    });
    return data.access_token;
  } catch (error: unknown) {
    const axiosError = error as AxiosError;
    console.error(
      "Authentication failed:",
      axiosError.response?.data || axiosError.message
    );
    throw axiosError;
  }
}
