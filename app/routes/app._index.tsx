import { useEffect, useState, useMemo } from "react";
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

  useEffect(() => {
    const width = parseFloat(dimensions.width);
    const length = parseFloat(dimensions.length);
    if (!isNaN(width) && !isNaN(length)) {
      setCircumference(2 * (width + length));
    } else {
      setCircumference(0);
    }
  }, [dimensions]);

  // This effect will run once on component mount to set the initial circumference
  useEffect(() => {
    setCircumference(2 * (12 + 24));
  }, []);

  const handleDimensionChange =
    (dimension: "width" | "length") => (value: string) => {
      setDimensions((prev) => ({ ...prev, [dimension]: value }));
    };

  const total = useMemo(() => {
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

    return sum;
  }, [circumference, selectedOptions, productData]);

  return (
    <Page>
      <TitleBar title="Order Generator"></TitleBar>
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
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
                  Selections
                </Text>
                <InlineStack gap="500">
                  {/* Readymade Products */}
                  <BlockStack gap="300">
                    {productData.readymade.map(
                      (product: any, index: number) => (
                        <Select
                          key={`readymade-${index}`}
                          label={product.title}
                          options={product.options.map((option: any) => ({
                            label: `${option.optionTitle} - $${option.price}`,
                            value: option.optionTitle,
                          }))}
                          onChange={(value) => {
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [`readymade-${product.title}`]: value,
                            }));
                          }}
                          value={
                            selectedOptions[`readymade-${product.title}`] || ""
                          }
                          placeholder="Select an option"
                        />
                      ),
                    )}
                  </BlockStack>

                  {/* Glass Products */}
                  <BlockStack gap="300">
                    {productData.glass.map((product: any, index: number) => (
                      <Select
                        key={`glass-${index}`}
                        label={product.title}
                        options={product.options.map((option: any) => ({
                          label: `${option.optionTitle} - $${option.price}`,
                          value: option.optionTitle,
                        }))}
                        onChange={(value) => {
                          setSelectedOptions((prev) => ({
                            ...prev,
                            [`glass-${product.title}`]: value,
                          }));
                        }}
                        value={selectedOptions[`glass-${product.title}`] || ""}
                        placeholder="Select an option"
                      />
                    ))}
                  </BlockStack>

                  {/* Mat Products */}
                  <BlockStack gap="300">
                    {productData.mat.map((product: any, index: number) => (
                      <Select
                        key={`mat-${index}`}
                        label={product.title}
                        options={product.options.map((option: any) => ({
                          label: `${option.optionTitle} - $${option.price}`,
                          value: option.optionTitle,
                        }))}
                        onChange={(value) => {
                          setSelectedOptions((prev) => ({
                            ...prev,
                            [`mat-${product.title}`]: value,
                          }));
                        }}
                        value={selectedOptions[`mat-${product.title}`] || ""}
                        placeholder="Select an option"
                      />
                    ))}
                  </BlockStack>

                  {/* Printing Products */}
                  <BlockStack gap="300">
                    {productData.printing.map((product: any, index: number) => (
                      <Select
                        key={`printing-${index}`}
                        label={product.title}
                        options={product.options.map((option: any) => ({
                          label: `${option.optionTitle} - $${option.price}`,
                          value: option.optionTitle,
                        }))}
                        onChange={(value) => {
                          setSelectedOptions((prev) => ({
                            ...prev,
                            [`printing-${product.title}`]: value,
                          }));
                        }}
                        value={
                          selectedOptions[`printing-${product.title}`] || ""
                        }
                        placeholder="Select an option"
                      />
                    ))}
                  </BlockStack>

                  {/* Mount Products */}
                  <BlockStack gap="300">
                    {productData.mount.map((product: any, index: number) => (
                      <Select
                        key={`mount-${index}`}
                        label={product.title}
                        options={product.options.map((option: any) => ({
                          label: `${option.optionTitle} - $${option.price}`,
                          value: option.optionTitle,
                        }))}
                        onChange={(value) => {
                          setSelectedOptions((prev) => ({
                            ...prev,
                            [`mount-${product.title}`]: value,
                          }));
                        }}
                        value={selectedOptions[`mount-${product.title}`] || ""}
                        placeholder="Select an option"
                      />
                    ))}
                  </BlockStack>

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
                {/* Total section */}
                <div>
                  <Text as="h3" variant="headingMd">
                    Total
                  </Text>
                  <Text variant="bodyLg" as="p">
                    ${total.toFixed(2)}
                  </Text>
                </div>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
