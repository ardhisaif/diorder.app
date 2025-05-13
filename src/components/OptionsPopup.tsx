import React, { useState, useEffect, useRef } from "react";
import { MenuItem } from "../types";
import { X, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";

interface OptionType {
  label: string;
  value: string;
  category: "level" | "topping";
  extraPrice: number;
}

interface OptionsPopupProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    quantity: number,
    selectedOptions: {
      level?: OptionType;
      toppings?: OptionType[];
    }
  ) => void;
}

const OptionsPopup: React.FC<OptionsPopupProps> = ({
  item,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState<OptionType | null>(null);
  const [selectedToppings, setSelectedToppings] = useState<OptionType[]>([]);
  const [showAllToppings, setShowAllToppings] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  // Auto-scroll to bottom after first level selection
  useEffect(() => {
    if (selectedLevel && !hasScrolled) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setHasScrolled(true);
      }, 200);
    }
  }, [selectedLevel, hasScrolled]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculateTotal = () => {
    let total = item.price * quantity;
    if (selectedLevel) {
      total += selectedLevel.extraPrice * quantity;
    }
    selectedToppings.forEach((topping) => {
      total += topping.extraPrice * quantity;
    });
    return total;
  };

  const handleAddToCart = () => {
    if (spiceLevels.length > 0 && !selectedLevel) return;
    onAddToCart(item, quantity, {
      level: selectedLevel || undefined,
      toppings: selectedToppings.length > 0 ? selectedToppings : undefined,
    });
    onClose();
  };

  const toggleTopping = (topping: OptionType) => {
    setSelectedToppings((prev) => {
      const exists = prev.find((t) => t.value === topping.value);
      if (exists) {
        return prev.filter((t) => t.value !== topping.value);
      }
      return [...prev, topping];
    });
  };

  // Filter options berdasarkan category
  const spiceLevels =
    item.options?.filter((opt) => opt.category === "level") || [];
  const toppings =
    item.options?.filter((opt) => opt.category === "topping") || [];
  const initialToppings = toppings.slice(0, 3);
  const remainingToppings = toppings.slice(3);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
      <div
        ref={popupRef}
        className="bg-white w-[90%] max-w-md max-h-[90vh] rounded-t-2xl overflow-y-auto relative"
      >
        <div className="sticky top-0 bg-white z-10 p-4 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Pilih Opsi</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
              aria-label="Tutup"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-start gap-4 mb-6">
            <img
              src={
                item.image?.startsWith("http") ? item.image : "/placeholder.svg"
              }
              alt={item.name}
              className="w-20 h-20 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-xl text-black truncate">
                {item.name}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-bold text-orange-500 text-xl">
                  {formatCurrency(item.price)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-8 h-8 flex items-center justify-center border-2 border-orange-500 text-orange-500 rounded-lg transition-colors hover:bg-orange-50 active:bg-orange-100"
                    aria-label="Kurangi jumlah"
                  >
                    <Minus size={24} />
                  </button>
                  <span className=" font-medium text-xl w-6 text-center select-none">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-orange-500 text-white rounded-lg transition-colors hover:bg-orange-600 active:bg-orange-700"
                    aria-label="Tambah jumlah"
                  >
                    <Plus size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {spiceLevels.length > 0 && (
            <div className="mb-6">
              <h4 className="font-bold text-lg mb-4 text-gray-800">
                Pilih Level Pedas
              </h4>
              <div className="space-y-3">
                {spiceLevels.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedLevel(option)}
                    className={`w-full p-4 border-2 rounded-xl text-base flex justify-between items-center transition-all duration-200 ${
                      selectedLevel?.value === option.value
                        ? "border-orange-500 bg-orange-50 text-orange-500"
                        : "border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <span className="font-medium">{option.label}</span>
                    <span className="text-sm font-medium">
                      +{formatCurrency(option.extraPrice)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-6">
            <h4 className="font-bold text-lg mb-4 text-gray-800">
              Pilih Topping (Opsional)
            </h4>
            <div className="space-y-3">
              {initialToppings.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleTopping(option)}
                  className={`w-full p-4 border-2 rounded-xl text-base flex justify-between items-center transition-all duration-200 ${
                    selectedToppings.some((t) => t.value === option.value)
                      ? "border-orange-500 bg-orange-50 text-orange-500"
                      : "border-gray-200 hover:border-orange-300"
                  }`}
                >
                  <span className="font-medium">{option.label}</span>
                  <span className="text-sm font-medium">
                    +{formatCurrency(option.extraPrice)}
                  </span>
                </button>
              ))}

              {remainingToppings.length > 0 && (
                <>
                  {showAllToppings && (
                    <div className="space-y-3 mt-3">
                      {remainingToppings.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => toggleTopping(option)}
                          className={`w-full p-4 border-2 rounded-xl text-base flex justify-between items-center transition-all duration-200 ${
                            selectedToppings.some(
                              (t) => t.value === option.value
                            )
                              ? "border-orange-500 bg-orange-50 text-orange-500"
                              : "border-gray-200 hover:border-orange-300"
                          }`}
                        >
                          <span className="font-medium">{option.label}</span>
                          <span className="text-sm font-medium">
                            +{formatCurrency(option.extraPrice)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setShowAllToppings(!showAllToppings)}
                    className="w-full p-4 text-base text-orange-500 hover:text-orange-600 flex items-center justify-center gap-2"
                  >
                    {showAllToppings ? (
                      <>
                        <span>Tampilkan Lebih Sedikit</span>
                        <ChevronUp size={20} />
                      </>
                    ) : (
                      <>
                        <span>
                          Lihat {remainingToppings.length} Topping Lainnya
                        </span>
                        <ChevronDown size={20} />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t p-4">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-lg text-gray-800">Total</span>
            <span className="font-bold text-2xl text-orange-500">
              {formatCurrency(calculateTotal())}
            </span>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={spiceLevels.length > 0 && !selectedLevel}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
              spiceLevels.length === 0 || selectedLevel
                ? "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            Tambah ke Keranjang
          </button>
        </div>
      </div>
    </div>
  );
};

export default OptionsPopup;
