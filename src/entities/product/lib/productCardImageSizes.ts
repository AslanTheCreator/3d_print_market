// ProductGrid inside the default Container: 16/32px gutters, 8/12/20px gaps,
// auto-fill minima 156/190px, 1504px container cap, 1px card borders.
// Below sm each GridItem also has 4px padding and the grid extends by 8px.
export const PRODUCT_CARD_IMAGE_SIZES = [
  "(max-width: 599.95px) calc((100vw - 52px) / 2)",
  "(max-width: 723.95px) calc((100vw - 94px) / 3)",
  "(max-width: 891.95px) calc((100vw - 108px) / 4)",
  "(max-width: 899.95px) calc((100vw - 122px) / 5)",
  "(max-width: 1093.95px) calc((100vw - 132px) / 4)",
  "(max-width: 1303.95px) calc((100vw - 154px) / 5)",
  "(max-width: 1503.95px) calc((100vw - 176px) / 6)",
  "221.34px",
].join(", ");
