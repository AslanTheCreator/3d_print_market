import axios from "axios";
import config from "@/shared/config/api";
import { AuthFormModel } from "../model/types";

const API_URL = `${config.apiBaseUrl}/participant`;

export const registerUser = async ({ email, password }: AuthFormModel) => {
  try {
    const { status, data } = await axios.post(
      API_URL,
      { email, password },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    if (status === 200) {
      console.log("Пользователь успешно зарегестрирован, его id: ", data);
    }
  } catch (error) {
    console.error("Registration error:", error);
  }
};
