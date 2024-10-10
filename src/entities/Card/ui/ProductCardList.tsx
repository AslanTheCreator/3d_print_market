import ProductCard from "./ProductCard";
import Stack from "@mui/material/Stack";

const cardList = [
  {
    author: "Aslan",
    price: 8000,
    name: "Black Templars Gladiator Lancer( Альт)",
  },
  {
    author: "Timur",
    price: 6000,
    name: "Black Templars Gladiator Lancer( Альт)",
  },
];

const ProductCardList = () => {
  return (
    <Stack gap={"25px"}>
      {cardList.map((card) => (
        <ProductCard
          key={card.author}
          author={card.author}
          series="Магическая битва"
          price={card.price}
          id={1}
          name={card.name}
          imageUrl={
            "https://minifreemarket.com/upload/thumbs/catalog/auction_thumb/photo-2023-07-31-19-57-26-2_6.21158319.webp"
          }
        />
      ))}
    </Stack>
  );
};

export default ProductCardList;
