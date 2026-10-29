import type { Availability } from "../model/types";

export const getProductPublicPath = (id: number, availability: Availability) =>
  availability === "GIVEAWAY" ? `/giveaways/${id}` : `/catalog/${id}/detail`;
