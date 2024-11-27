import React from "react";
import {
  Card,
  Button,
  BlockStack,
  Text,
  TextField,
  Divider,
} from "@shopify/polaris";

interface OrderDetailsProps {
  orderDetails: any[];
  total: number;
  discount: string;
  adjustedTotal: number;
  setDiscount: React.Dispatch<React.SetStateAction<string>>;
  selectedCustomer: any;
  fetcher: any;
  resetEverything: () => void;
}

const OrderDetails: React.FC<OrderDetailsProps> = ({
  orderDetails,
  total,
  discount,
  setDiscount,
  adjustedTotal,
  resetEverything,
  fetcher,
  selectedCustomer,
}) => {
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h3" variant="headingMd">
          Order Details
        </Text>
        <BlockStack gap="300">
          {orderDetails.map((order, index) => (
            <>
              <Text key={index} as="p">
                {Object.entries(order).map(([key, value]) => (
                  <div key={key}>
                    {key}: {value}
                  </div>
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
        {orderDetails.length > 0 && (
          <fetcher.Form method="post">
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
            <button
              name="_action"
              value="createOrder"
              type="submit"
              style={{
                all: "unset", // Reset default button styles
                display: "inline-block", // Match Polaris Button's block layout
                cursor: "pointer",
                width: "100%",
              }}
            >
              <Button variant="primary" fullWidth>
                Create Order
              </Button>
            </button>
          </fetcher.Form>
        )}
        <Button onClick={resetEverything}>Reset Order</Button>
      </BlockStack>
    </Card>
  );
};

export default OrderDetails;
