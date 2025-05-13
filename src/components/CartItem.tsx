import React, { useState } from "react";
import { CartItem as CartItemType } from "../types";
import { useCart } from "../context/CartContext";
import { Plus, Minus } from "lucide-react";
import LazyImage from "./LazyImage";

interface CartItemProps {
  item: CartItemType;
  merchantId: number;
}

const CartItem: React.FC<CartItemProps> = ({ item, merchantId }) => {
  const { updateQuantity, updateItemNotes } = useCart();
  const [notes, setNotes] = useState(item.notes || "");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateItemTotal = () => {
    let total = item.price * item.quantity;

    // Add level price if exists
    if (item.selectedOptions?.level) {
      total += item.selectedOptions.level.extraPrice * item.quantity;
    }

    // Add toppings price if exists
    if (item.selectedOptions?.toppings) {
      item.selectedOptions.toppings.forEach((topping) => {
        total += topping.extraPrice * item.quantity;
      });
    }

    return total;
  };

  const renderPriceBreakdown = () => {
    const breakdown = [];

    // Base price
    breakdown.push(
      <div key="base" className="flex justify-between text-sm">
        <span>Harga Dasar</span>
        <span>{formatCurrency(item.price)}</span>
      </div>
    );

    // Level price if exists
    if (item.selectedOptions?.level) {
      breakdown.push(
        <div key="level" className="flex justify-between text-sm">
          <span>{item.selectedOptions.level.label}</span>
          <span>{formatCurrency(item.selectedOptions.level.extraPrice)}</span>
        </div>
      );
    }

    // Toppings prices if exist
    if (item.selectedOptions?.toppings) {
      item.selectedOptions.toppings.forEach((topping, index) => {
        breakdown.push(
          <div
            key={`topping-${index}`}
            className="flex justify-between text-sm"
          >
            <span>+ {topping.label}</span>
            <span>{formatCurrency(topping.extraPrice)}</span>
          </div>
        );
      });
    }

    // Subtotal per item
    const subtotalPerItem =
      item.price +
      (item.selectedOptions?.level?.extraPrice || 0) +
      (item.selectedOptions?.toppings?.reduce(
        (sum, t) => sum + t.extraPrice,
        0
      ) || 0);

    breakdown.push(
      <div
        key="subtotal"
        className="flex justify-between text-sm font-medium mt-1 pt-1 border-t"
      >
        <span>Subtotal per item</span>
        <span>{formatCurrency(subtotalPerItem)}</span>
      </div>
    );

    // Total for all items
    breakdown.push(
      <div key="total" className="flex justify-between text-sm font-bold mt-1">
        <span>Total ({item.quantity} item)</span>
        <span>{formatCurrency(calculateItemTotal())}</span>
      </div>
    );

    return breakdown;
  };

  return (
    <div className="bg-white rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <LazyImage
          src={item.image.startsWith("http") ? item.image : "/placeholder.svg"}
          alt=""
          className="w-20 h-20 object-cover rounded-lg"
        />
        <div className="ml-4 flex-1">
          <h3 className="font-bold text-lg">{item.name}</h3>
          {item.selectedOptions?.level && (
            <p className="text-gray-600 text-base">
              Level: {item.selectedOptions.level.label}
            </p>
          )}
          {item.selectedOptions?.toppings &&
            item.selectedOptions.toppings.length > 0 && (
              <p className="text-gray-600 text-base">
                Topping:{" "}
                {item.selectedOptions.toppings.map((t) => t.label).join(", ")}
              </p>
            )}
          <div className="mt-2">
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                updateItemNotes(item.id, e.target.value, merchantId);
              }}
              placeholder="Tambahkan catatan (opsional)"
              className="w-full p-2 border rounded-lg text-base"
              rows={2}
            />
          </div>
          <div className="mt-4">{renderPriceBreakdown()}</div>
          <div className="flex justify-end items-center mt-4">
            <button
              onClick={() =>
                updateQuantity(item.id, item.quantity - 1, merchantId)
              }
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 text-white active:bg-orange-600"
              aria-label="Kurangi jumlah"
            >
              <Minus size={24} />
            </button>
            <span className="mx-4 font-medium text-xl">{item.quantity}</span>
            <button
              onClick={() =>
                updateQuantity(item.id, item.quantity + 1, merchantId)
              }
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 text-white active:bg-orange-600"
              aria-label="Tambah jumlah"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;
