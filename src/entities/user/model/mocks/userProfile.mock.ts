import { UserProfileModel } from "../types";

export const mockUserProfile: UserProfileModel = {
  id: 1,
  fullName: "Иван Иванов",
  login: "ivan_ivanov",
  mail: "ivan.ivanov@example.com",
  role: "admin",
  imageId: 101,
  image: [
    {
      filename: "",
      contentType: "https://example.com/images/avatar-ivan.jpg",
      imageData: "Аватар Иван Иванов",
    },
  ],
};
