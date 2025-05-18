import React, { useState, useEffect, useRef } from "react";
import { MenuItem, CartItem } from "../types";
import { Plus, Minus, Info, X } from "lucide-react";
import { useCart } from "../context/CartContext";
import { Link } from "react-router-dom";
import LazyImage from "./LazyImage";
import OptionsPopup from "./OptionsPopup";

interface ProductCardProps {
  item: MenuItem;
  merchantId: number;
  merchantName: string;
  isOpen?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  item,
  merchantId,
  merchantName,
  isOpen = false,
}) => {
  const { addToCart, removeFromCart, getMerchantItems } = useCart();
  const [showOptions, setShowOptions] = useState(false);
  const [showVariantPopup, setShowVariantPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Helper: semua varian dari menu ini di cart (khusus merchant ini)
  const allVariants = getMerchantItems(merchantId).filter(
    (ci) => ci.id === item.id
  );
  const totalQuantity = allVariants.reduce((sum, v) => sum + v.quantity, 0);

  // Auto-close variant popup when all variants are removed
  useEffect(() => {
    if (showVariantPopup && totalQuantity === 0) {
      setShowVariantPopup(false);
    }
  }, [showVariantPopup, totalQuantity]);

  // Handle click outside for variant popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        setShowVariantPopup(false);
      }
    };

    if (showVariantPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showVariantPopup]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddToCart = (
    item: MenuItem,
    quantity: number,
    selectedOptions: { [groupId: string]: string | string[] }
  ) => {
    if (!selectedOptions) return;
    // Create a new MenuItem with selectedOptions
    const menuItem: MenuItem = {
      ...item,
      selectedOptions,
    };
    addToCart(menuItem, merchantId, quantity);
  };

  // Handler plus
  const handlePlus = () => {
    if (!isOpen) return;
    if (
      item.options &&
      item.options.optionGroups &&
      item.options.optionGroups.length > 0
    ) {
      setShowOptions(true);
    } else {
      addToCart(item, merchantId);
    }
  };

  // Handler minus
  const handleMinus = () => {
    if (!isOpen || totalQuantity === 0) return;
    if (
      item.options &&
      item.options.optionGroups &&
      item.options.optionGroups.length > 0
    ) {
      if (allVariants.length === 1) {
        removeFromCart(allVariants[0], merchantId);
      } else {
        setShowVariantPopup(true);
      }
    } else {
      // Convert MenuItem to CartItem for removeFromCart
      const cartItem: CartItem = {
        ...item,
        quantity: 1,
        notes: "",
        selectedOptions: undefined,
      };
      removeFromCart(cartItem, merchantId);
    }
  };

  // Handler plus variant
  const handlePlusVariant = (variant: CartItem) => {
    // Convert CartItem back to MenuItem for addToCart
    const menuItem: MenuItem = {
      ...item,
      selectedOptions: {
        // Convert TransformedOptions back to MenuItem selectedOptions format
        ...(variant.selectedOptions?.level && {
          [item.options?.optionGroups.find((g) => g.type === "single_required")
            ?.id || ""]: variant.selectedOptions.level.value,
        }),
        ...(variant.selectedOptions?.toppings && {
          [item.options?.optionGroups.find(
            (g) => g.type === "multiple_optional"
          )?.id || ""]: variant.selectedOptions.toppings.map((t) => t.value),
        }),
      },
    };
    addToCart(menuItem, merchantId);
  };

  // Handler minus variant
  const handleMinusVariant = (variant: CartItem) => {
    removeFromCart(variant, merchantId);
  };

  return (
    <>
      <div
        className={`bg-white rounded-lg shadow-md overflow-hidden ${
          !isOpen ? "grayscale" : ""
        }`}
      >
        <div className="flex">
          <div className="relative overflow-hidden flex items-center justify-center p-2">
            <LazyImage
              src={
                item.image.startsWith("http") ? item.image : "/placeholder.svg"
              }
              alt=""
              className={`w-24 h-24 rounded-lg object-cover ${
                !isOpen ? "grayscale" : ""
              }`}
              loading="eager"
              priority={true}
            />
          </div>
          <div className="p-4 flex-1 ml-1">
            <h3 className="font-bold text-lg">{item.name}</h3>
            <Link
              to={`/menu/${merchantId}`}
              className="text-sm text-blue-500 flex items-center"
            >
              <Info size={14} className="mr-1" />
              {merchantName}
            </Link>
            <div className="flex justify-between items-center mt-1">
              <span className="font-bold text-orange-500 text-lg">
                {formatCurrency(item.price)}
              </span>
              {isOpen ? (
                <div className="flex items-center gap-2 ml-2">
                  {totalQuantity > 0 ? (
                    <>
                      <button
                        onClick={handleMinus}
                        className="w-8 h-8 flex items-center justify-center border-2 border-orange-500 text-orange-500 rounded-lg transition-colors hover:bg-orange-50 active:bg-orange-100"
                        aria-label="Kurangi jumlah"
                      >
                        <Minus size={24} />
                      </button>
                      <span className="font-medium text-xl w-4 text-center select-none">
                        {totalQuantity}
                      </span>
                      <button
                        onClick={handlePlus}
                        className="w-8 h-8 flex items-center justify-center bg-orange-500 text-white rounded-lg transition-colors hover:bg-orange-600 active:bg-orange-700"
                        aria-label="Tambah jumlah"
                      >
                        <Plus size={24} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handlePlus}
                      className="px-5 py-1 flex items-center justify-center bg-orange-500 text-white rounded-lg transition-colors hover:bg-orange-600 active:bg-orange-700"
                      aria-label="Pesan menu ini"
                    >
                      <span className="font-medium text-base">Pesan</span>
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Options Popup */}
      {showOptions && (
        <OptionsPopup
          item={item}
          onClose={() => setShowOptions(false)}
          onAddToCart={handleAddToCart}
        />
      )}

      {/* Variant Popup */}
      {showVariantPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div
            ref={popupRef}
            className="bg-white rounded-lg p-4 w-[90%] max-w-md max-h-[80vh] overflow-y-auto relative"
          >
            <div className="sticky top-0 bg-white z-10 pb-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold">Pilih Varian</h3>
                <button
                  onClick={() => setShowVariantPopup(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className="space-y-3 mt-4">
              {getMerchantItems(merchantId)
                .filter((variant) => variant.id === item.id)
                .map((variant) => {
                  const levelValue =
                    variant.selectedOptions?.level?.value || "-";
                  const toppingValues =
                    variant.selectedOptions?.toppings
                      ?.map((t) => t.value)
                      .sort()
                      .join("-") || "-";
                  const key = `${variant.id}-${levelValue}-${toppingValues}`;
                  return (
                    <div
                      key={key}
                      className="w-full p-3 border rounded-xl text-sm flex flex-col gap-1 border-orange-300"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-semibold truncate mr-2">
                          {item.name}
                        </span>
                        <span className="font-bold text-orange-500">
                          {formatCurrency(
                            (variant.price +
                              (variant.selectedOptions?.level?.extraPrice ||
                                0) +
                              (variant.selectedOptions?.toppings?.reduce(
                                (sum, t) => sum + t.extraPrice,
                                0
                              ) || 0)) *
                              variant.quantity
                          )}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {variant.selectedOptions?.level?.label && (
                          <span>
                            Level: {variant.selectedOptions.level.label}{" "}
                          </span>
                        )}
                        {variant.selectedOptions?.toppings &&
                          variant.selectedOptions.toppings.length > 0 && (
                            <span>
                              | Topping:{" "}
                              {variant.selectedOptions.toppings
                                .map((t) => t.label)
                                .join(", ")}
                            </span>
                          )}
                      </div>
                      <div className="flex items-center gap-2 mt-2 justify-end">
                        <button
                          onClick={() => handleMinusVariant(variant)}
                          className="w-8 h-8 flex items-center justify-center border border-orange-400 text-orange-500 rounded-full transition-colors hover:bg-orange-50"
                          disabled={variant.quantity === 0}
                        >
                          <Minus size={16} />
                        </button>
                        <span className="mx-2 font-medium text-base w-4 text-center select-none">
                          {variant.quantity}
                        </span>
                        <button
                          onClick={() => handlePlusVariant(variant)}
                          className="w-8 h-8 flex items-center justify-center bg-orange-500 text-white rounded-full transition-colors hover:bg-orange-600"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProductCard;
