import { useEffect, useState, useMemo, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useFetcher, useLoaderData } from "@remix-run/react";
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
  RadioButton,
  Button,
  Divider,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getVariants } from "app/utils/utils";
import type { Customer } from "../components/Customer";
import { CustomerSearch } from "../components/Customer";

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

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  console.log({ formData });
  const searchQuery = formData.get("searchQuery");
  const action = formData.get("_action");
  const customerId = formData.get("customerId");
  const orderDetails = formData.get("orderDetails");

  if (action === "createOrder") {
    console.log("create");
    console.log(orderDetails);
    const orderDetailsArray = JSON.parse(orderDetails as string);
    const lineItems = orderDetailsArray?.map((order) => ({
      quantity: 1,
      title: JSON.stringify(order),
      priceSet: {
        shopMoney: {
          amount: parseFloat(order.subtotal),
          currencyCode: "CAD",
        },
      },
    }));
    console.log(lineItems);
    const response = await admin.graphql(
      `
        mutation OrderCreate($order: OrderCreateOrderInput!) {
          orderCreate(order: $order) {
            userErrors {
              field
              message
            }
            order {
              id
              customer {
                id
              }
            }
          }
        }
    `,
      {
        variables: {
          order: {
            currency: "CAD",
            lineItems: [...lineItems],
            ...(customerId ? { customerId } : {}),
          },
        },
      },
    );

    const responseJson = await response.json();
    console.log(JSON.stringify(responseJson.data.orderCreate));
    return responseJson;
  }

  if (searchQuery) {
    const response = await admin.graphql(
      `
      query GetCustomers($query: String!) {
        customers(first: 10, query: $query) {
          edges {
            node {
              id
              firstName
              lastName
              phone
            }
          }
        }
      }
    `,
      {
        variables: {
          query: searchQuery,
        },
      },
    );

    const responseJson = await response.json();
    return json({ customer: responseJson.data.customers });
  }
};

export default function Index() {
  const fetcher = useFetcher();
  const { productData } = useLoaderData<typeof loader>();
  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [dimensions, setDimensions] = useState({ width: "0", length: "0" });
  const [circumference, setCircumference] = useState(0);
  const [mouldingUnitPrice, setMouldingUnitPrice] = useState("0");
  const [matType, setMatType] = useState("stock");
  const [customMatPrice, setCustomMatPrice] = useState("0");
  const [labour, setLabour] = useState("0");
  const [labourRate, setLabourRate] = useState("40");
  const [discount, setDiscount] = useState("0");
  const [total, setTotal] = useState(0);
  const [adjustedTotal, setAdjustedTotal] = useState(0);
  const [orderDetails, setOrderDetails] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );

  useEffect(() => {
    const width = parseFloat(dimensions.width);
    const length = parseFloat(dimensions.length);
    if (!isNaN(width) && !isNaN(length)) {
      setCircumference(2 * (width + length));
    } else {
      setCircumference(0);
    }
  }, [dimensions]);

  const handleDimensionChange =
    (dimension: "width" | "length") => (value: string) => {
      setDimensions((prev) => ({ ...prev, [dimension]: value }));
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

    const minOrder = Math.max(96, Math.ceil(circumference / 96) * 96);
    sum = sum + minOrder * parseFloat(mouldingUnitPrice) || 0;

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
    setDimensions({ width: "0", length: "0" });
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
    setOrderDetails([]);
  }, [resetFields]);

  const handleAddToOrder = useCallback(() => {
    const newOrder = {
      ...selectedOptions,
      ...dimensions,
      mouldingUnitPrice,
      customMatPrice,
      labour,
      subtotal,
    };

    setOrderDetails((prevOrders) => {
      const updatedOrders = [...prevOrders, newOrder];
      return updatedOrders;
    });

    resetFields();
    setTotal((prev) => prev + subtotal);
  }, [
    selectedOptions,
    dimensions,
    mouldingUnitPrice,
    customMatPrice,
    labour,
    subtotal,
    resetFields,
  ]);

  return (
    <Page>
      <TitleBar title="Order Generator" />
      <BlockStack gap="500">
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
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
            <BlockStack gap="500">
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">
                    Order Details
                  </Text>
                  <BlockStack gap="300">
                    {orderDetails.map((order, index) => (
                      <>
                        <Text key={index} as="p">
                          {Object.entries(order)
                            .filter(([key, value]) => parseFloat(value) !== 0)
                            .map(([key, value]) => (
                              <Text key={key}>
                                {key}: {value}
                              </Text>
                            ))}
                        </Text>
                        <Divider />
                      </>
                    ))}
                  </BlockStack>
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
              <CustomerSearch
                selectedCustomer={selectedCustomer}
                handleSelect={setSelectedCustomer}
              />
              <fetcher.Form method="post">
                {/* <Button
                  variant="primary"
                  onClick={handleCreateOrder}
                  id="create"
                >
                  Create Order
                </Button> */}
                <input
                  type="hidden"
                  name="customerId"
                  value={selectedCustomer?.id}
                />
                <input
                  type="hidden"
                  name="orderDetails"
                  value={JSON.stringify(orderDetails)}
                />
                <button name="_action" value="createOrder" type="submit">
                  Create Order
                </button>
              </fetcher.Form>
              <Button tone="critical" onClick={resetEverything}>
                Reset Order
              </Button>
            </BlockStack>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
