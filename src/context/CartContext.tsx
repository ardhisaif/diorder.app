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
  // TransformedOptions,
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
  Bendungan: 11000,
  Duduksampeyan: 5000,
  Glanggang: 8000,
  Gredek: 10000,
  Kandangan: 8000,
  Kawistowindu: 8000,
  Kemudi: 8000,
  "Kramat Kulon": 10000,
  Palebon: 8000,
  Pandanan: 10000,
  Panjunan: 10000,
  Petisbenem: 5000,
  Samirplapan: 6000,
  Setrohadi: 5000,
  Sumari: 8000,
  Sumengko: 5000,
  Tambakrejo: 10000,
  Tebaloan: 8000,
  Tirem: 10000,
  Tumapel: 8000,
  "Wadak Kidul": 10000,
  "Wadak Lor": 10000,
};

// Fungsi utilitas untuk membuat key unik berdasarkan semua opsi
function getCartItemKey(item: { id: number; selectedOptions?: unknown }) {
  const base = item.id;
  if (!item.selectedOptions) return base.toString();
  // Pastikan selectedOptions adalah object
  if (typeof item.selectedOptions !== "object" || item.selectedOptions === null)
    return base.toString();
  const options = Object.entries(
    item.selectedOptions as Record<string, unknown>
  )
    .map(([groupId, value]) => {
      if (Array.isArray(value)) {
        return `${groupId}:${value.slice().sort().join(",")}`;
      }
      // Untuk object (TransformedOption), ambil value/id jika ada
      if (typeof value === "object" && value !== null && "value" in value) {
        return `${groupId}:${(value as { value: string }).value}`;
      }
      return `${groupId}:${value}`;
    })
    .sort()
    .join("|");
  return `${base}|${options}`;
}

export const CartProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [cartState, setCartState] = useState<CartState>(getInitialState);
  const [isClearingCart, setIsClearingCart] = useState(false);
  const [isDBReady, setIsDBReady] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  const getUniqueMerchantCount = () => {
    return Object.keys(cartState.items).length;
  };

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
    let deliveryFee = baseShippingCost * (multiplier + 1);

    // Calculate additional fee for multiple merchants
    const merchantCount = getUniqueMerchantCount();
    if (merchantCount > 3) {
      // Add 50% for each merchant after the third one
      const additionalMerchants = merchantCount - 3;
      const additionalFee = deliveryFee * 0.5 * additionalMerchants;
      deliveryFee += additionalFee;
    }

    // Round up to nearest 1000
    deliveryFee = Math.ceil(deliveryFee / 1000) * 1000;

    return deliveryFee;
  };

  const addToCart = (
    item: MenuItem,
    merchantId: number,
    quantity: number = 1
  ) => {
    // Calculate current state
    const currentSubtotal = getTotalPrice();
    const currentMerchantCount = getUniqueMerchantCount();
    const isNewMerchant = !cartState.items[merchantId];
    const newMerchantCount = isNewMerchant
      ? currentMerchantCount + 1
      : currentMerchantCount;

    // Transform selected options
    const transformedOptions = item.selectedOptions
      ? {
          variant: (() => {
            const group = item.options?.optionGroups.find(
              (g) => g.id === "varian" || g.id === "variant"
            );
            if (!group) return undefined;
            const option = group.options.find(
              (o) => o.id === item.selectedOptions?.[group.id]
            );
            if (!option) return undefined;
            return {
              label: option.name,
              value: item.selectedOptions[group.id] as string,
              extraPrice: option.extraPrice,
            };
          })(),
          level: (() => {
            const group = item.options?.optionGroups.find(
              (g) => g.id === "spice_level"
            );
            if (!group) return undefined;
            const option = group.options.find(
              (o) => o.id === item.selectedOptions?.["spice_level"]
            );
            if (!option) return undefined;
            return {
              label: option.name,
              value: item.selectedOptions["spice_level"] as string,
              extraPrice: option.extraPrice,
            };
          })(),
          toppings: (() => {
            const group = item.options?.optionGroups.find(
              (g) => g.type === "multiple_optional"
            );
            if (!group) return undefined;
            return group.options
              .filter((o) =>
                (item.selectedOptions?.[group.id] as string[])?.includes(o.id)
              )
              .map((o) => ({
                label: o.name,
                value: o.id,
                extraPrice: o.extraPrice,
              }));
          })(),
        }
      : undefined;

    // Create temporary state with new item
    const tempState = {
      ...cartState,
      items: {
        ...cartState.items,
        [merchantId]: [
          ...(cartState.items[merchantId] || []),
          {
            ...item,
            quantity,
            notes: "",
            selectedOptions: transformedOptions,
          },
        ],
      },
    };

    // Calculate new subtotal with temporary state
    const newSubtotal = Object.values(tempState.items).reduce(
      (total, merchantItems) => {
        return (
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
              itemTotal +=
                item.selectedOptions.level.extraPrice * item.quantity;
            }

            // Add toppings price if exists
            if (item.selectedOptions?.toppings) {
              item.selectedOptions.toppings.forEach((topping) => {
                itemTotal += topping.extraPrice * item.quantity;
              });
            }

            return merchantTotal + itemTotal;
          }, 0)
        );
      },
      0
    );

    // Calculate delivery fees
    const getDeliveryFee = (state: CartState) => {
      if (
        state.customerInfo.isCustomVillage &&
        state.customerInfo.needsNegotiation
      ) {
        return -1;
      }

      const village = state.customerInfo.village;
      let baseShippingCost = 5000;

      if (village && village in VILLAGE_SHIPPING_COSTS) {
        baseShippingCost = VILLAGE_SHIPPING_COSTS[village];
      }

      const totalAmount = Object.values(state.items).reduce(
        (total, merchantItems) => {
          return (
            total +
            merchantItems.reduce((merchantTotal, item) => {
              return merchantTotal + item.price * item.quantity;
            }, 0)
          );
        },
        0
      );

      const multiplier = Math.floor(totalAmount / 100000);
      let deliveryFee = baseShippingCost * (multiplier + 1);

      const merchantCount = Object.keys(state.items).length;
      if (merchantCount > 3) {
        const additionalMerchants = merchantCount - 3;
        const additionalFee = deliveryFee * 0.5 * additionalMerchants;
        deliveryFee += additionalFee;
      }

      return Math.ceil(deliveryFee / 1000) * 1000;
    };

    const oldDeliveryFee = getDeliveryFee(cartState);
    const newDeliveryFee = getDeliveryFee(tempState);

    // Check if adding these items would exceed 100k for the first time
    if (
      currentSubtotal <= 100000 &&
      newSubtotal > 100000 &&
      !cartState.customerInfo.isCustomVillage
    ) {
      const message = `Total pesanan Anda telah melebihi Rp 100.000. Untuk keamanan pengiriman, ongkir akan bertambah Rp ${newDeliveryFee.toLocaleString(
        "id-ID"
      )} (berlaku kelipatan Rp 100.000 berikutnya).`;
      setAlertMessage(message);
      setShowAlert(true);
    }

    // Check if adding item from a new merchant would exceed 3 merchants
    if (isNewMerchant && newMerchantCount === 4) {
      const additionalFee = newDeliveryFee - oldDeliveryFee;
      const message = `Anda menambahkan pesanan dari resto ke-4. Ongkir akan bertambah Rp ${additionalFee.toLocaleString(
        "id-ID"
      )}.`;
      setAlertMessage(message);
      setShowAlert(true);
    }

    // Create a new cart item
    const newItem: CartItem = {
      ...item,
      quantity,
      notes: "",
      selectedOptions: transformedOptions,
    };

    // Update cart state
    setCartState((prevState) => {
      const merchantItems = prevState.items[merchantId] || [];
      const existingItemIndex = merchantItems.findIndex(
        (cartItem) =>
          cartItem.id === newItem.id &&
          JSON.stringify(cartItem.selectedOptions) ===
            JSON.stringify(newItem.selectedOptions)
      );

      if (existingItemIndex !== -1) {
        // Update quantity if item exists
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
        // Add new item if it doesn't exist
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
      const itemKey = getCartItemKey(item);

      const updatedMerchantItems = merchantItems
        .map((cartItem) => {
          const cartItemKey = getCartItemKey(cartItem);
          if (cartItemKey === itemKey) {
            return cartItem.quantity > 1
              ? { ...cartItem, quantity: cartItem.quantity - 1 }
              : null;
          }
          return cartItem;
        })
        .filter(Boolean) as CartItem[];

      // If this was the last item from this merchant, remove the merchant entry
      if (updatedMerchantItems.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [merchantId]: _, ...remainingItems } = prevState.items;
        return {
          ...prevState,
          items: remainingItems,
        };
      }

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
