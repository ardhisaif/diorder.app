import React, { useState } from "react";
import { CartItem as CartItemType, MenuItem } from "../types";
import { useCart } from "../context/CartContext";
import { Plus, Minus } from "lucide-react";
import LazyImage from "./LazyImage";

interface CartItemProps {
  item: CartItemType;
  merchantId: number;
  menuData?: MenuItem[];
}

const CartItem: React.FC<CartItemProps> = ({ item, merchantId, menuData }) => {
  const { updateQuantity, updateItemNotes } = useCart();
  const [notes, setNotes] = useState(item.notes || "");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const menu =
    menuData?.find((m) => m.id === item.id) || (item as unknown as MenuItem);

  const getOptionInfo = (groupId: string, value: string | string[]) => {
    if (!menu?.options?.optionGroups) return null;
    const group = menu.options.optionGroups.find((g) => g.id === groupId);
    if (!group) return null;
    if (Array.isArray(value)) {
      return value
        .map((val) => {
          const opt = group.options.find((o) => o.id === val);
          return opt ? { group, opt } : null;
        })
        .filter(Boolean);
    } else {
      const opt = group.options.find((o) => o.id === value);
      return opt ? [{ group, opt }] : null;
    }
  };

  const calculateItemTotal = () => {
    let total = item.price * item.quantity;
    if (item.selectedOptions && menu?.options?.optionGroups) {
      Object.entries(item.selectedOptions).forEach(([groupId, value]) => {
        const infos = getOptionInfo(groupId, value);
        if (infos) {
          infos.forEach(({ opt }) => {
            total += opt.extraPrice * item.quantity;
          });
        }
      });
    }
    return total;
  };

  const renderPriceBreakdown = () => {
    const breakdown = [];
    breakdown.push(
      <div key="base" className="flex justify-between text-sm">
        <span>Harga Dasar</span>
        <span>{formatCurrency(item.price)}</span>
      </div>
    );
    if (item.selectedOptions && menu?.options?.optionGroups) {
      Object.entries(item.selectedOptions).forEach(([groupId, value]) => {
        const infos = getOptionInfo(groupId, value);
        if (infos) {
          infos.forEach(({ group, opt }, idx) => {
            breakdown.push(
              <div
                key={`${groupId}-${opt.id}-${idx}`}
                className="flex justify-between text-sm"
              >
                <span>
                  {group.title}: {opt.name}
                </span>
                <span>{formatCurrency(opt.extraPrice)}</span>
              </div>
            );
          });
        }
      });
    }
    const subtotalPerItem = calculateItemTotal() / item.quantity;
    breakdown.push(
      <div
        key="subtotal"
        className="flex justify-between text-sm font-medium mt-1 pt-1 border-t"
      >
        <span>Subtotal per item</span>
        <span>{formatCurrency(subtotalPerItem)}</span>
      </div>
    );
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
          {item.selectedOptions && menu?.options?.optionGroups && (
            <div className="text-gray-600 text-base">
              {Object.entries(item.selectedOptions).map(([groupId, value]) => {
                const infos = getOptionInfo(groupId, value);
                if (!infos) return null;
                return infos.map(({ group, opt }, idx) => (
                  <div key={`${groupId}-${opt.id}-${idx}`}>
                    {group.title}: {opt.name}
                  </div>
                ));
              })}
            </div>
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
