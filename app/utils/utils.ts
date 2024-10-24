export const getVariants = (products: any) => {
  return products.map((product) => ({
    title: product?.title,
    options: product?.variants?.edges.map(({ node }) => ({
      optionTitle: node?.title,
      price: node?.price,
    })),
  }));
};
