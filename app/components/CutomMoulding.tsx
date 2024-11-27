import React from "react";
import { TextField, Select, InlineStack } from "@shopify/polaris";

interface CustomMouldingProps {
  productData: any;
  mouldingUnitPrice: string;
  setMouldingUnitPrice: React.Dispatch<React.SetStateAction<string>>;
  selectedOptions: Record<string, string>;
  setSelectedOptions: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
}

const CustomMoulding: React.FC<CustomMouldingProps> = ({
  productData,
  mouldingUnitPrice,
  setMouldingUnitPrice,
  setSelectedOptions,
  selectedOptions,
}) => {
  return (
    <InlineStack gap="300">
      <TextField
        label="Moulding Unit Price"
        type="number"
        prefix="$"
        value={mouldingUnitPrice}
        onChange={setMouldingUnitPrice}
        autoComplete="off"
      />
      {/* Glass options */}
      {productData.glass.map((product: any, index: number) => (
        <Select
          key={`glass-${index}`}
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
              [`glass-${product.title}`]: value,
            }));
          }}
          value={selectedOptions[`glass-${product.title}`] || "0"}
        />
      ))}
    </InlineStack>
  );
};

export default CustomMoulding;
