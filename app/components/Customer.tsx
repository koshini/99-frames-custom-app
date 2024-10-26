import { useEffect, useState, useCallback, useRef } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Autocomplete,
  Text,
  Card,
  Link,
  BlockStack,
  Icon,
  InlineStack,
} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

const CustomerSearch = () => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [inputValue, setInputValue] = useState("");
  const [options, setOptions] = useState<
    Array<{ value: string; label: string; customer: Customer }>
  >([]);

  const fetcher = useFetcher();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const updateText = useCallback(
    (value: string) => {
      setInputValue(value);
      if (value === "") {
        setOptions([]);
        return;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        fetcher.submit(
          { phoneNumber: value },
          { method: "post", action: "/app?index" },
        );
      }, 1000);
    },
    [fetcher],
  );

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (fetcher.data && fetcher.data.customer) {
      const customers = fetcher.data.customer.edges.map((edge: any) => {
        const customer: Customer = {
          id: edge.node.id,
          firstName: edge.node.firstName,
          lastName: edge.node.lastName,
          phone: edge.node.phone,
        };
        return {
          value: customer.phone,
          label: `${customer.firstName} ${customer.lastName} (${customer.phone})`,
          customer: customer,
        };
      });
      setOptions(customers);
    }
  }, [fetcher.data]);

  const updateSelection = useCallback(
    (selected: string[]) => {
      if (selected.length > 0) {
        const matchedOption = options.find(
          (option) => option.value === selected[0],
        );
        if (matchedOption) {
          setSelectedCustomer(matchedOption.customer);
          setInputValue(matchedOption.label);
        }
      } else {
        setSelectedCustomer(null);
        setInputValue("");
      }
    },
    [options],
  );

  const textField = (
    <Autocomplete.TextField
      onChange={updateText}
      label="Customers"
      value={inputValue}
      prefix={<Icon source={SearchIcon} tone="base" />}
      placeholder="Search"
      autoComplete="off"
    />
  );

  return (
    <Card>
      <BlockStack gap="300">
        <fetcher.Form method="post">
          <InlineStack gap="300" align="end">
            <Link url="shopify://admin/customers/new">Create new customer</Link>
          </InlineStack>
          <Text as="h3">Search existing customer by phone number</Text>
          <Autocomplete
            options={options}
            selected={selectedCustomer ? [selectedCustomer.phone] : []}
            onSelect={updateSelection}
            textField={textField}
          />
        </fetcher.Form>
        {selectedCustomer && (
          <BlockStack gap="200">
            <Text as="h4" variant="headingMd">
              Selected Customer:
            </Text>
            <Text as="p">
              Name: {selectedCustomer.firstName} {selectedCustomer.lastName}
            </Text>
            <Text as="p">{createCustomerUrl(selectedCustomer.id)}</Text>
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
};

export default CustomerSearch;

function createCustomerUrl(gid: string) {
  const customerId = gid.split("/").pop();
  const link = `shopify://admin/customers/${customerId}`;
  return <Link url={link}>customer info</Link>;
}
