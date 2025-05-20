import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  CartItem,
  CustomerInfo,
  MenuItem,
  TransformedOptions,
  CartState,
} from "../types";
import { indexedDBService } from "../utils/indexedDB";
import CustomAlert from "../components/CustomAlert";

// Add a constant for localStorage key
const CUSTOMER_INFO_STORAGE_KEY = "diorder_customer_info";

interface CartContextType {
  items: { [merchantId: number]: CartItem[] };
  customerInfo: CustomerInfo;
  addToCart: (item: MenuItem, merchantId: number, quantity?: number) => void;
  removeFromCart: (item: CartItem, merchantId: number) => void;
  updateQuantity: (
    item: CartItem,
    merchantId: number,
    quantity: number
  ) => void;
  updateNotes: (item: CartItem, merchantId: number, notes: string) => void;
  clearCart: () => void;
  getMerchantItems: (merchantId: number) => CartItem[];
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getMerchantTotalPrice: (merchantId: number) => number;
  setCustomerInfo: (info: CustomerInfo) => void;
  saveCart: () => Promise<void>;
  loadCart: () => Promise<void>;
  calculateDeliveryFee: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const getInitialState = (): CartState => {
  if (typeof window === "undefined") {
    return {
      items: {},
      customerInfo: { name: "", address: "", notes: "" },
    };
  }

  // Try to get customer info from localStorage
  let savedCustomerInfo: CustomerInfo = { name: "", address: "", notes: "" };
  try {
    const savedInfo = localStorage.getItem(CUSTOMER_INFO_STORAGE_KEY);
    if (savedInfo) {
      savedCustomerInfo = JSON.parse(savedInfo);
    }
  } catch (error) {
    console.error("Error reading customer info from localStorage:", error);
  }

  return {
    items: {},
    customerInfo: savedCustomerInfo,
  };
};

// Village shipping costs mapping
const VILLAGE_SHIPPING_COSTS: { [key: string]: number } = {
  "Ambeng-ambeng Watangrejo": 10000,
  Bendungan: 10000,
  Duduksampeyan: 5000,
  Glanggang: 8000,
  Gredek: 8000,
  Kandangan: 8000,
  Kawistowindu: 8000,
  Kemudi: 8000,
  "Kramat Kulon": 10000,
  Palebon: 8000,
  Pandanan: 10000,
  Panjunan: 10000,
  Petisbenem: 5000,
  Samirplapan: 5000,
  Setrohadi: 5000,
  Sumari: 8000,
  Sumengko: 5000,
  Tambakrejo: 10000,
  Tebaloan: 8000,
  Tirem: 10000,
  Tumapel: 8000,
  "Wadak Kidul": 8000,
  "Wadak Lor": 10000,
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [cartState, setCartState] = useState<CartState>(getInitialState);
  const [isClearingCart, setIsClearingCart] = useState(false);
  const [isDBReady, setIsDBReady] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Initialize IndexedDB and load cart data
  useEffect(() => {
    const initDB = async () => {
      try {
        await indexedDBService.initDB();
        setIsDBReady(true);

        // Load cart data from IndexedDB
        const cartItems = await indexedDBService.getCart();
        if (cartItems.length > 0) {
          const groupedItems = cartItems.reduce((acc, item) => {
            if (!acc[item.merchant_id]) {
              acc[item.merchant_id] = [];
            }
            acc[item.merchant_id].push(item);
            return acc;
          }, {} as CartState["items"]);

          setCartState((prev) => ({
            ...prev,
            items: groupedItems,
          }));
        }
      } catch (error) {
        console.error("Error initializing IndexedDB:", error);
      }
    };
    initDB();
  }, []);

  // Sync cart data to IndexedDB whenever it changes
  useEffect(() => {
    if (!isDBReady) return;
    if (isClearingCart) return;

    const syncToIndexedDB = async () => {
      try {
        // Get all current cart items
        const allItems = Object.entries(cartState.items).flatMap(
          ([merchantId, items]) =>
            items.map((item) => ({
              ...item,
              merchant_id: Number(merchantId),
              // Ensure selectedOptions is properly structured
              selectedOptions: item.selectedOptions
                ? {
                    variant: item.selectedOptions.variant
                      ? {
                          label: item.selectedOptions.variant.label,
                          value: item.selectedOptions.variant.value,
                          extraPrice: item.selectedOptions.variant.extraPrice,
                        }
                      : undefined,
                    level: item.selectedOptions.level
                      ? {
                          label: item.selectedOptions.level.label,
                          value: item.selectedOptions.level.value,
                          extraPrice: item.selectedOptions.level.extraPrice,
                        }
                      : undefined,
                    toppings: item.selectedOptions.toppings?.map((topping) => ({
                      label: topping.label,
                      value: topping.value,
                      extraPrice: topping.extraPrice,
                    })),
                  }
                : undefined,
            }))
        );

        // Clear existing cart in IndexedDB
        await indexedDBService.clearCart();

        // Add all current items to IndexedDB
        for (const item of allItems) {
          await indexedDBService.addToCart(item);
        }

        console.log("Cart synced to IndexedDB:", allItems);
      } catch (error) {
        console.error("Error syncing to IndexedDB:", error);
      }
    };

    syncToIndexedDB();
  }, [cartState.items, isDBReady, isClearingCart]);

  // Effect to save customer info to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(
          CUSTOMER_INFO_STORAGE_KEY,
          JSON.stringify(cartState.customerInfo)
        );
      } catch (error) {
        console.error("Error saving customer info to localStorage:", error);
      }
    }
  }, [cartState.customerInfo]);

  const calculateDeliveryFee = () => {
    // Jika desa kustom dan perlu negosiasi, return -1 sebagai penanda untuk "Ongkir Nego"
    if (
      cartState.customerInfo.isCustomVillage &&
      cartState.customerInfo.needsNegotiation
    ) {
      return -1; // Menggunakan -1 sebagai penanda khusus
    }

    // Get the village from customer info
    const village = cartState.customerInfo.village;
    let baseShippingCost = 5000; // Default shipping cost

    // If village exists in our mapping, use its shipping cost
    if (village && village in VILLAGE_SHIPPING_COSTS) {
      baseShippingCost = VILLAGE_SHIPPING_COSTS[village];
    }

    // Calculate total order amount
    const totalAmount = getTotalPrice();

    // Calculate shipping cost based on total amount
    // For every 100,000 increment, add the base shipping cost
    const multiplier = Math.floor(totalAmount / 100000);
    return baseShippingCost * (multiplier + 1);
  };

  const addToCart = (
    item: MenuItem,
    merchantId: number,
    quantity: number = 1
  ) => {
    // console.log("Adding to cart:", { item, merchantId, quantity });

    const currentSubtotal = getTotalPrice();
    const newSubtotal = currentSubtotal + item.price * quantity;

    // Check if adding these items would exceed 100k for the first time
    if (
      currentSubtotal <= 100000 &&
      newSubtotal > 100000 &&
      !cartState.customerInfo.isCustomVillage
    ) {
      const newDeliveryFee = calculateDeliveryFee();
      const message = `Total pesanan Anda telah melebihi Rp 100.000. Untuk keamanan pengiriman, ongkir akan bertambah Rp ${newDeliveryFee.toLocaleString(
        "id-ID"
      )} (berlaku kelipatan Rp 100.000 berikutnya).`;
      setAlertMessage(message);
      setShowAlert(true);
    }

    setCartState((prevState) => {
      const merchantItems = prevState.items[merchantId] || [];

      // Transform selected options into the correct format
      const transformedOptions: TransformedOptions | undefined =
        item.selectedOptions
          ? {
              variant: (() => {
                // Find the variant option group (first single_required group)
                const variantGroup = item.options?.optionGroups.find(
                  (g) => g.type === "single_required"
                );
                // console.log("Variant group:", variantGroup);
                if (!variantGroup) return undefined;
                const selectedId = item.selectedOptions![
                  variantGroup.id
                ] as string;
                // console.log("Selected variant ID:", selectedId);
                if (!selectedId) return undefined;
                const selectedOption = variantGroup.options.find(
                  (o) => o.id === selectedId
                );
                // console.log("Selected variant option:", selectedOption);
                return selectedOption
                  ? {
                      label: selectedOption.name,
                      value: selectedOption.id,
                      extraPrice: selectedOption.extraPrice,
                    }
                  : undefined;
              })(),
              level: (() => {
                // Find the spice level option group (second single_required group)
                const spiceLevelGroup = item.options?.optionGroups.find(
                  (g, index) => g.type === "single_required" && index > 0
                );
                // console.log("Spice level group:", spiceLevelGroup);
                if (!spiceLevelGroup) return undefined;
                const selectedId = item.selectedOptions![
                  spiceLevelGroup.id
                ] as string;
                // console.log("Selected level ID:", selectedId);
                if (!selectedId) return undefined;
                const selectedOption = spiceLevelGroup.options.find(
                  (o) => o.id === selectedId
                );
                // console.log("Selected level option:", selectedOption);
                return selectedOption
                  ? {
                      label: selectedOption.name,
                      value: selectedOption.id,
                      extraPrice: selectedOption.extraPrice,
                    }
                  : undefined;
              })(),
              toppings: (() => {
                const multipleGroup = item.options?.optionGroups.find(
                  (g) => g.type === "multiple_optional"
                );
                // console.log("Toppings group:", multipleGroup);
                if (!multipleGroup) return undefined;
                const selectedIds = item.selectedOptions![
                  multipleGroup.id
                ] as string[];
                // console.log("Selected topping IDs:", selectedIds);
                if (!selectedIds) return undefined;
                return multipleGroup.options
                  .filter((o) => selectedIds.includes(o.id))
                  .map((o) => ({
                    label: o.name,
                    value: o.id,
                    extraPrice: o.extraPrice,
                  }));
              })(),
            }
          : undefined;

      // console.log("Transformed options:", transformedOptions);

      // Create new cart item with transformed options
      const newItem: CartItem = {
        ...item,
        quantity,
        notes: "",
        selectedOptions: transformedOptions,
      };

      // Find existing item with same options
      const existingItemIndex = merchantItems.findIndex(
        (ci) =>
          ci.id === newItem.id &&
          JSON.stringify(ci.selectedOptions) ===
            JSON.stringify(newItem.selectedOptions)
      );

      if (existingItemIndex !== -1) {
        // Update existing item
        const updatedItems = [...merchantItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + quantity,
        };
        return {
          ...prevState,
          items: {
            ...prevState.items,
            [merchantId]: updatedItems,
          },
        };
      } else {
        // Add new item
        return {
          ...prevState,
          items: {
            ...prevState.items,
            [merchantId]: [...merchantItems, newItem],
          },
        };
      }
    });
  };

  const removeFromCart = (item: CartItem, merchantId: number) => {
    setCartState((prevState) => {
      const merchantItems = prevState.items[merchantId] || [];
      // Create a unique identifier for the item based on its options
      const itemKey = item.selectedOptions
        ? `${item.id}-${item.selectedOptions.level?.value}-${
            item.selectedOptions.toppings
              ?.map((t) => t.value)
              .sort()
              .join("-") || ""
          }`
        : item.id.toString();

      const updatedMerchantItems = merchantItems
        .map((cartItem) => {
          const cartItemKey = cartItem.selectedOptions
            ? `${cartItem.id}-${cartItem.selectedOptions.level?.value}-${
                cartItem.selectedOptions.toppings
                  ?.map((t) => t.value)
                  .sort()
                  .join("-") || ""
              }`
            : cartItem.id.toString();

          if (cartItemKey === itemKey) {
            return cartItem.quantity > 1
              ? { ...cartItem, quantity: cartItem.quantity - 1 }
              : null;
          }
          return cartItem;
        })
        .filter(Boolean) as CartItem[];

      return {
        ...prevState,
        items: {
          ...prevState.items,
          [merchantId]: updatedMerchantItems,
        },
      };
    });
  };

  const updateQuantity = (
    item: CartItem,
    merchantId: number,
    quantity: number
  ) => {
    if (quantity <= 0) {
      removeFromCart(item, merchantId);
      return;
    }

    setCartState((prevState) => {
      const merchantItems = prevState.items[merchantId] || [];
      const updatedMerchantItems = merchantItems.map((cartItem) =>
        cartItem.id === item.id ? { ...cartItem, quantity } : cartItem
      );

      return {
        ...prevState,
        items: {
          ...prevState.items,
          [merchantId]: updatedMerchantItems,
        },
      };
    });
  };

  const updateNotes = (item: CartItem, merchantId: number, notes: string) => {
    setCartState((prevState) => {
      const merchantItems = prevState.items[merchantId] || [];
      const updatedMerchantItems = merchantItems.map((cartItem) =>
        cartItem.id === item.id ? { ...cartItem, notes } : cartItem
      );

      return {
        ...prevState,
        items: {
          ...prevState.items,
          [merchantId]: updatedMerchantItems,
        },
      };
    });
  };

  // Modify the clearCart function to properly handle IndexedDB
  const clearCart = async () => {
    setIsClearingCart(true);
    setCartState((prevState) => ({
      ...prevState,
      items: {},
    }));

    try {
      // Get all cart items from IndexedDB
      const cartItems = await indexedDBService.getCart();

      // Delete each item
      for (const item of cartItems) {
        const itemKey = item.selectedOptions
          ? `${item.selectedOptions.level?.value || ""}-${
              item.selectedOptions.toppings
                ?.map((t) => t.value)
                .sort()
                .join("-") || ""
            }`
          : "default";
        await indexedDBService.removeFromCart(
          item.id,
          item.merchant_id,
          itemKey
        );
      }
    } catch (error) {
      console.error("Error clearing cart in IndexedDB:", error);
    } finally {
      setIsClearingCart(false);
    }
  };

  const getMerchantItems = (merchantId: number) => {
    return cartState.items[merchantId] || [];
  };

  const getTotalItems = () => {
    return Object.values(cartState.items).reduce(
      (total, merchantItems) =>
        total + merchantItems.reduce((count, item) => count + item.quantity, 0),
      0
    );
  };

  const getTotalPrice = () => {
    return Object.values(cartState.items).reduce(
      (total, merchantItems) =>
        total +
        merchantItems.reduce((merchantTotal, item) => {
          let itemTotal = item.price * item.quantity;

          // Add variant price if exists
          if (item.selectedOptions?.variant) {
            itemTotal +=
              item.selectedOptions.variant.extraPrice * item.quantity;
          }

          // Add level price if exists
          if (item.selectedOptions?.level) {
            itemTotal += item.selectedOptions.level.extraPrice * item.quantity;
          }

          // Add toppings price if exists
          if (item.selectedOptions?.toppings) {
            item.selectedOptions.toppings.forEach((topping) => {
              itemTotal += topping.extraPrice * item.quantity;
            });
          }

          return merchantTotal + itemTotal;
        }, 0),
      0
    );
  };

  const getMerchantTotalPrice = (merchantId: number) => {
    const merchantItems = cartState.items[merchantId] || [];
    return merchantItems.reduce((total, item) => {
      let itemTotal = item.price * item.quantity;

      // Add variant price if exists
      if (item.selectedOptions?.variant) {
        itemTotal += item.selectedOptions.variant.extraPrice * item.quantity;
      }

      // Add level price if exists
      if (item.selectedOptions?.level) {
        itemTotal += item.selectedOptions.level.extraPrice * item.quantity;
      }

      // Add toppings price if exists
      if (item.selectedOptions?.toppings) {
        item.selectedOptions.toppings.forEach((topping) => {
          itemTotal += topping.extraPrice * item.quantity;
        });
      }

      return total + itemTotal;
    }, 0);
  };

  const setCustomerInfo = (info: CustomerInfo) => {
    setCartState((prevState) => ({
      ...prevState,
      customerInfo: info,
    }));

    // This is redundant due to the useEffect above, but adding as a safeguard
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(CUSTOMER_INFO_STORAGE_KEY, JSON.stringify(info));
      } catch (error) {
        console.error("Error saving customer info to localStorage:", error);
      }
    }
  };

  const saveCart = async () => {
    try {
      await indexedDBService.saveCart(cartState.items);
    } catch (error) {
      console.error("Error saving cart to IndexedDB:", error);
    }
  };

  const loadCart = async () => {
    try {
      const loadedItems = await indexedDBService.loadCart();
      setCartState((prevState) => ({
        ...prevState,
        items: loadedItems,
      }));
    } catch (error) {
      console.error("Error loading cart from IndexedDB:", error);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items: cartState.items,
        customerInfo: cartState.customerInfo,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateNotes,
        clearCart,
        getMerchantItems,
        getTotalItems,
        getTotalPrice,
        getMerchantTotalPrice,
        setCustomerInfo,
        saveCart,
        loadCart,
        calculateDeliveryFee,
      }}
    >
      {children}
      {showAlert && (
        <CustomAlert
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      )}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
