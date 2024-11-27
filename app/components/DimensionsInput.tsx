import React from "react";
import { TextField, Text } from "@shopify/polaris";

interface DimensionsInputProps {
  dimensions: { width: string; length: string };
  setDimensions: React.Dispatch<
    React.SetStateAction<{ width: string; length: string }>
  >;
  circumference: number;
}

const DimensionsInput: React.FC<DimensionsInputProps> = ({
  dimensions,
  setDimensions,
  circumference,
}) => {
  const handleWidthChange = (value: string) => {
    setDimensions((prev) => ({ ...prev, width: value }));
  };

  const handleLengthChange = (value: string) => {
    setDimensions((prev) => ({ ...prev, length: value }));
  };

  return (
    <div>
      <TextField
        label="Width"
        value={dimensions.width}
        onChange={handleWidthChange}
        type="number"
        autoComplete="off"
      />
      <TextField
        label="Length"
        value={dimensions.length}
        onChange={handleLengthChange}
        type="number"
        autoComplete="off"
      />
      <Text as="p">Circumference: {circumference.toFixed(2)}</Text>
    </div>
  );
};

export default DimensionsInput;
