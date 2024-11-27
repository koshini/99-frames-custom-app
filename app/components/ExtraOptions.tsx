import React from "react";
import {
  TextField,
  Select,
  InlineStack,
  Card,
  Text,
  RadioButton,
  Checkbox,
} from "@shopify/polaris";

interface ExtraOptionsProps {
  productData: any;
  selectedOptions: Record<string, string>;
  setSelectedOptions: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  matType: string;
  setMatType: React.Dispatch<React.SetStateAction<string>>;
  customMatPrice: string;
  setCustomMatPrice: React.Dispatch<React.SetStateAction<string>>;
  labour: string;
  setLabour: React.Dispatch<React.SetStateAction<string>>;
  labourRate: string;
  setLabourRate: React.Dispatch<React.SetStateAction<string>>;
}

const ExtraOptions: React.FC<ExtraOptionsProps> = ({
  productData,
  matType,
  setMatType,
  customMatPrice,
  setCustomMatPrice,
  labour,
  setLabour,
  labourRate,
  setLabourRate,
  setSelectedOptions,
  selectedOptions,
}) => {
  return (
    <Card>
      <Text as="h3" variant="headingMd">
        Extras
      </Text>
      {/* Mat Options */}
      <InlineStack gap="300">
        <RadioButton
          label="Stock Mat"
          checked={matType === "stock"}
          onChange={() => {
            setMatType("stock");
            setCustomMatPrice("0");
          }}
        />
        <RadioButton
          label="Custom Mat"
          checked={matType === "custom"}
          onChange={() => {
            setMatType("custom");
            // Set stock mat option to "0" when custom mat is selected
            setSelectedOptions((prev) => ({
              ...prev,
              "mat-Mat": "0",
            }));
          }}
        />
        {matType === "stock" ? (
          productData.mat.map((product: any, index: number) => (
            <Select
              key={`mat-${index}`}
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
                  [`mat-${product.title}`]: value,
                }));
              }}
              value={selectedOptions[`mat-${product.title}`] || "0"}
            />
          ))
        ) : (
          <TextField
            label="Price"
            type="number"
            prefix="$"
            value={customMatPrice}
            onChange={(value) => setCustomMatPrice(value)}
            autoComplete="off"
          />
        )}
      </InlineStack>

      {/* Printing Products */}
      {productData.printing.map((product: any, index: number) => (
        <Select
          key={`printing-${index}`}
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
              [`printing-${product.title}`]: value,
            }));
          }}
          value={selectedOptions[`printing-${product.title}`] || "0"}
        />
      ))}

      {/* Mount Products */}
      {productData.mount.map((product: any, index: number) => (
        <Select
          key={`mount-${index}`}
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
              [`mount-${product.title}`]: value,
            }));
          }}
          value={selectedOptions[`mount-${product.title}`] || "0"}
        />
      ))}
      <InlineStack gap="300">
        {/* Extras Products */}
        <InlineStack gap="300">
          {productData.extras.map((product: any, index: number) => (
            <div key={`extras-${index}`}>
              <Text as="p" variant="headingSm">
                {product.title}
              </Text>
              {product.options.map((option: any, optionIndex: number) => (
                <Checkbox
                  key={`extras-${index}-${optionIndex}`}
                  label={`$${option.price}`}
                  checked={
                    selectedOptions[
                      `extras-${product.title}-${option.optionTitle}`
                    ] === "true"
                  }
                  onChange={(checked) => {
                    setSelectedOptions((prev) => ({
                      ...prev,
                      [`extras-${product.title}-${option.optionTitle}`]:
                        checked.toString(),
                    }));
                  }}
                />
              ))}
            </div>
          ))}
        </InlineStack>
      </InlineStack>
      <TextField
        label="Labour (hours)"
        type="number"
        value={labour}
        onChange={(value) => setLabour(value)}
        autoComplete="off"
      />
      <TextField
        label="Labour Rate"
        type="number"
        prefix="$"
        value={labourRate}
        onChange={(value) => setLabourRate(value)}
        autoComplete="off"
      />
    </Card>
  );
};

export default ExtraOptions;
