import React from "react";
import { Select } from "@shopify/polaris";

interface ReadyMadeProps {
  productData: any;
  selectedOptions: Record<string, string>;
  setSelectedOptions: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}

const ReadyMade: React.FC<ReadyMadeProps> = ({
  productData,
  selectedOptions,
  setSelectedOptions,
}) => {
  return (
    <>
      {productData.readymade.map((product: any, index: number) => (
        <Select
          key={`readymade-${index}`}
          label={product.title}
          options={[
            { label: "n/a", value: "0" },
            ...product.options.map((option: any) => ({
              label: `${option.optionTitle} - $${option.price}`,
              value: option.optionTitle,
            })),
          ]}
          onChange={(value) => {
            setSelectedOptions((prev) => ({
              ...prev,
              [`readymade-${product.title}`]: value,
            }));
          }}
          value={selectedOptions[`readymade-${product.title}`] || "0"}
        />
      ))}
    </>
  );
};

export default ReadyMade;
