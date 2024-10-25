import { useEffect, useState, useMemo, useCallback } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  Select,
  Checkbox,
  TextField,
  InlineStack,
  PageActions,
  RadioButton,
  Button,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getVariants } from "app/utils/utils";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const productTypes = [
    "readymade",
    "glass",
    "mat",
    "printing",
    "mount",
    "extras",
  ];
  const productData: Record<string, any> = {};

  for (const productType of productTypes) {
    const response = await admin.graphql(
      `#graphql
        query {
          products(first: 10, query: "product_type:${productType}") {
            edges {
              node {
                id
                title
                handle
                productType
                variants (first: 100) {
                  edges {
                    node {
                      price
                      title
                    }
                  }
                }
              }
            }
          }
        }
      `,
    );

    const responseJson = await response.json();
    const products = responseJson.data.products.edges.map(
      (edge: any) => edge.node,
    );
    const variants = getVariants(products);
    productData[productType] = variants;
  }

  return json({ productData });
};

export default function Index() {
  const { productData } = useLoaderData<typeof loader>();
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [dimensions, setDimensions] = useState({ width: "12", length: "24" });
  const [circumference, setCircumference] = useState(0);
  const [mouldingUnitPrice, setMouldingUnitPrice] = useState("0");
  const [matType, setMatType] = useState("stock");
  const [customMatPrice, setCustomMatPrice] = useState("0");
  const [labour, setLabour] = useState("0");
  const [labourRate, setLabourRate] = useState("40");
  const [discount, setDiscount] = useState("0");
  const [total, setTotal] = useState(0);
  const [adjustedTotal, setAdjustedTotal] = useState(0);

  useEffect(() => {
    const width = parseFloat(dimensions.width);
    const length = parseFloat(dimensions.length);
    if (!isNaN(width) && !isNaN(length)) {
      setCircumference(2 * (width + length));
    } else {
      setCircumference(0);
    }
  }, [dimensions]);

  useEffect(() => {
    setCircumference(2 * (12 + 24));
  }, []);

  const handleDimensionChange =
    (dimension: "width" | "length") => (value: string) => {
      setDimensions((prev) => ({ ...prev, [dimension]: value }));
    };

  const handleMouldingUnitPriceChange = (value: string) => {
    setMouldingUnitPrice(value);
  };

  const subtotal = useMemo(() => {
    let sum = 0;

    // Add prices from selected dropdowns
    Object.entries(selectedOptions).forEach(([key, value]) => {
      if (!key.startsWith("extras") && value) {
        const [productType, productTitle] = key.split("-");
        const product = productData[productType].find(
          (p: any) => p.title === productTitle,
        );
        if (product) {
          const option = product.options.find(
            (o: any) => o.optionTitle === value,
          );
          if (option) {
            sum += parseFloat(option.price);
          }
        }
      }
    });

    // Add prices from checked extras
    productData["extras"].forEach((product: any) => {
      product.options.forEach((option: any) => {
        if (
          selectedOptions[`extras-${product.title}-${option.optionTitle}`] ===
          "true"
        ) {
          sum += parseFloat(option.price) * circumference;
        }
      });
    });
    sum = sum + circumference * parseFloat(mouldingUnitPrice) || 0;

    if (matType === "custom") {
      sum += parseFloat(customMatPrice) || 0;
    }

    const labourCost =
      (parseFloat(labour) || 0) * (parseFloat(labourRate) || 0);

    return sum + labourCost;
  }, [
    selectedOptions,
    productData,
    circumference,
    mouldingUnitPrice,
    matType,
    labour,
    labourRate,
    customMatPrice,
  ]);

  useEffect(() => {
    const newTotal = total - parseFloat(discount) || 0;
    setAdjustedTotal(newTotal);
  }, [total, discount]);

  const resetFields = useCallback(() => {
    setSelectedOptions({});
    setDimensions({ width: "12", length: "24" });
    setMouldingUnitPrice("0");
    setMatType("stock");
    setCustomMatPrice("0");
    setLabour("0");
  }, []);

  const resetEverything = useCallback(() => {
    resetFields();
    setDiscount("0");
    setTotal(0);
    setAdjustedTotal(0);
  }, [resetFields]);

  const handleAddToOrder = useCallback(() => {
    resetFields();
    setTotal((prev) => prev + subtotal);
  }, [resetFields, subtotal]);

  return (
    <Page>
      <TitleBar title="Order Generator" />
      <PageActions
        primaryAction={{
          content: "Reset All",
          onAction: resetEverything,
        }}
      />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                {/* Readymade Products */}
                <Text as="h3" variant="headingMd">
                  Readymade
                </Text>
                <BlockStack gap="300">
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
                      value={
                        selectedOptions[`readymade-${product.title}`] || "0"
                      }
                    />
                  ))}
                </BlockStack>
                {/* Dimensions section */}
                <Text as="h3" variant="headingMd">
                  Dimensions
                </Text>
                <BlockStack gap="300">
                  <InlineStack gap="300">
                    <TextField
                      label="Width"
                      type="number"
                      value={dimensions.width}
                      onChange={handleDimensionChange("width")}
                      autoComplete="off"
                    />
                    <TextField
                      label="Length"
                      type="number"
                      value={dimensions.length}
                      onChange={handleDimensionChange("length")}
                      autoComplete="off"
                    />
                  </InlineStack>
                  <Text as="p">Circumference: {circumference.toFixed(2)}</Text>
                </BlockStack>
                <Text as="h3" variant="headingMd">
                  Custom Moulding
                </Text>
                <InlineStack gap="300">
                  <TextField
                    label="Moulding Unit Price"
                    type="number"
                    prefix="$"
                    value={mouldingUnitPrice}
                    onChange={handleMouldingUnitPriceChange}
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
                      value={
                        selectedOptions[`printing-${product.title}`] || "0"
                      }
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
                          {product.options.map(
                            (option: any, optionIndex: number) => (
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
                            ),
                          )}
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
                <div>
                  <Text as="h3" variant="headingMd">
                    Subtotal
                  </Text>
                  <Text variant="bodyLg" as="p">
                    ${subtotal.toFixed(2)}
                  </Text>
                </div>
                <InlineStack gap="300" align="end">
                  <Button onClick={resetFields}>Clear</Button>
                  <Button variant="primary" onClick={handleAddToOrder}>
                    Add to Order
                  </Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Total: ${total.toFixed(2)}
                </Text>
                <Divider />
                <TextField
                  label="Discount"
                  type="number"
                  prefix="$"
                  value={discount}
                  onChange={(value) => setDiscount(value)}
                  autoComplete="off"
                />
                {adjustedTotal > 0 && (
                  <Text as="h3" variant="headingMd">
                    Adjusted Total: ${adjustedTotal.toFixed(2)}
                  </Text>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
