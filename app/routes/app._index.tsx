import { useEffect, useState, useMemo, useCallback } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  useActionData,
  useAsyncValue,
  useFetcher,
  useLoaderData,
} from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Button,
  Text,
  Link,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getVariants } from "app/utils/utils";
import { CustomerSearch, type Customer } from "../components/CustomerSearch";
import DimensionsInput from "../components/DimensionsInput";
import CustomMoulding from "../components/CutomMoulding";
import OrderDetails from "../components/OrderDetails";
import ReadyMade from "../components/ReadyMade";
import ExtraOptions from "app/components/ExtraOptions";

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
  const searchQuery = formData.get("searchQuery");
  const action = formData.get("_action");
  const customerId = formData.get("customerId");
  const orderDetails = formData.get("orderDetails");
  if (action === "createOrder") {
    const orderDetailsArray = JSON.parse(orderDetails as string);
    const formatOrderDetails = orderDetailsArray?.map((order) =>
      Object.entries(order)
        .map(([key, value]) => `${key}: ${value}`)
        .join(", "),
    );

    const lineItems = formatOrderDetails?.map((orderString) => {
      const orderEntries = Object.fromEntries(
        orderString.split(", ").map((entry) => {
          const [key, value] = entry.split(": ");
          return [key.trim(), value.trim()];
        }),
      );
      const subtotalValue = parseFloat(orderEntries.subtotal) || 0;
      return {
        quantity: 1,
        title: "item",
        priceSet: {
          shopMoney: {
            amount: subtotalValue,
            currencyCode: "CAD",
          },
        },
      };
    });
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
            note: JSON.stringify(formatOrderDetails),
            ...(customerId ? { customerId } : {}),
          },
        },
      },
    );

    const responseJson = await response.json();
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
  const [showOrderStatusCard, setShowOrderStatusCard] = useState(true);

  useEffect(() => {
    const width = parseFloat(dimensions.width);
    const length = parseFloat(dimensions.length);
    if (!isNaN(width) && !isNaN(length)) {
      setCircumference(2 * (width + length));
    } else {
      setCircumference(0);
    }
  }, [dimensions]);

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

  const lineItems = orderDetails.map((order) => {
    return Object.entries(order)
      .filter(([key, value]) => parseFloat(value) !== 0)
      .reduce((acc, [key, value]) => {
        acc[key] = value;
        return acc;
      }, {});
  });

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
    setSelectedCustomer(null);
    setOrderDetails([]);
    setShowOrderStatusCard(false);
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

    setOrderDetails((prevOrders) => [...prevOrders, newOrder]);
    resetFields();
    setTotal((prev) => prev + subtotal);
    setShowOrderStatusCard(true);
  }, [
    selectedOptions,
    dimensions,
    mouldingUnitPrice,
    customMatPrice,
    labour,
    subtotal,
    resetFields,
  ]);

  const orderCreateData = fetcher.data?.data?.orderCreate;

  let orderStatusCard;
  if (orderCreateData?.userErrors?.length === 0 && showOrderStatusCard) {
    const orderId = orderCreateData.order.id.split("/").pop();
    const url = `shopify://admin/orders/${orderId}`;
    orderStatusCard = (
      <Card>
        <Text as="p">
          Order is created. <Link url={url}>Check here</Link>
        </Text>
      </Card>
    );
  } else if (orderCreateData?.userErrors?.length > 0 && showOrderStatusCard) {
    orderStatusCard = (
      <Card>
        <Text as="p" tone="critical">
          `An error has occured ${JSON.stringify(orderCreateData.userErrors)}`
        </Text>
      </Card>
    );
  }

  return (
    <Page>
      <TitleBar title="Order Generator" />

      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h3" variant="headingMd">
                Readymade Frames
              </Text>
              <ReadyMade
                productData={productData}
                selectedOptions={selectedOptions}
                setSelectedOptions={setSelectedOptions}
              />
              <Text as="h3" variant="headingMd">
                Custom Frames
              </Text>
              <DimensionsInput
                dimensions={dimensions}
                setDimensions={setDimensions}
                circumference={circumference}
              />
              <CustomMoulding
                productData={productData}
                mouldingUnitPrice={mouldingUnitPrice}
                setMouldingUnitPrice={setMouldingUnitPrice}
                selectedOptions={selectedOptions}
                setSelectedOptions={setSelectedOptions}
              />
              <ExtraOptions
                productData={productData}
                selectedOptions={selectedOptions}
                setSelectedOptions={setSelectedOptions}
                matType={matType}
                setMatType={setMatType}
                customMatPrice={customMatPrice}
                setCustomMatPrice={setCustomMatPrice}
                labour={labour}
                setLabour={setLabour}
                labourRate={labourRate}
                setLabourRate={setLabourRate}
              />
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
            <CustomerSearch
              selectedCustomer={selectedCustomer}
              handleSelect={setSelectedCustomer}
            />
            <OrderDetails
              orderDetails={lineItems}
              total={total}
              discount={discount}
              adjustedTotal={adjustedTotal}
              setDiscount={setDiscount}
              selectedCustomer={selectedCustomer}
              fetcher={fetcher}
              resetEverything={resetEverything}
            />
            {orderStatusCard}
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
