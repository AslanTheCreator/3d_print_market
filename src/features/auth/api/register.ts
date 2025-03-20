import axios from "axios";
import config from "@/shared/config/api";
import { RegisterUserDTO } from "@/shared/api/dto/userRegister.dto";

const API_URL = `${config.apiBaseUrl}/participant`;

export const registerUser = async ({ login, password }: RegisterUserDTO) => {
  try {
    const { status, data } = await axios.post(
      API_URL,
      { login, password },
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
