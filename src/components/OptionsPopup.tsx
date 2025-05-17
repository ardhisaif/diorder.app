import React, { useState, useEffect, useRef } from "react";
import { MenuItem, MenuOptionGroup, MenuOption } from "../types";
import { X, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";

interface OptionsPopupProps {
  item: MenuItem;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    quantity: number,
    selectedOptions: { [groupId: string]: string | string[] }
  ) => void;
}

const OptionsPopup: React.FC<OptionsPopupProps> = ({
  item,
  onClose,
  onAddToCart,
}) => {
  const [quantity, setQuantity] = useState(1);
  // State untuk selected per group
  const [selectedOptions, setSelectedOptions] = useState<{
    [groupId: string]: string | string[];
  }>({});
  const [showAll, setShowAll] = useState<{ [groupId: string]: boolean }>({});
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

  // Auto-scroll to bottom after first group selection (optional)
  useEffect(() => {
    if (!hasScrolled && Object.keys(selectedOptions).length > 0) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setHasScrolled(true);
      }, 200);
    }
  }, [selectedOptions, hasScrolled]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Hitung total harga
  const calculateTotal = () => {
    let total = item.price * quantity;
    if (item.options?.optionGroups) {
      item.options.optionGroups.forEach((group) => {
        const selected = selectedOptions[group.id];
        if (group.type.startsWith("single")) {
          const opt = group.options.find((o) => o.id === selected);
          if (opt) total += opt.extraPrice * quantity;
        } else if (
          group.type === "multiple_optional" &&
          Array.isArray(selected)
        ) {
          selected.forEach((selId) => {
            const opt = group.options.find((o) => o.id === selId);
            if (opt) total += opt.extraPrice * quantity;
          });
        }
      });
    }
    return total;
  };

  // Handler select option
  const handleSelect = (group: MenuOptionGroup, option: MenuOption) => {
    if (group.type.startsWith("single")) {
      setSelectedOptions((prev) => ({ ...prev, [group.id]: option.id }));
    } else if (group.type === "multiple_optional") {
      setSelectedOptions((prev) => {
        const prevArr = Array.isArray(prev[group.id])
          ? (prev[group.id] as string[])
          : [];
        if (prevArr.includes(option.id)) {
          return {
            ...prev,
            [group.id]: prevArr.filter((id) => id !== option.id),
          };
        } else {
          if (group.maxSelections && prevArr.length >= group.maxSelections)
            return prev;
          return { ...prev, [group.id]: [...prevArr, option.id] };
        }
      });
    }
  };

  // Validasi required
  const isValid = () => {
    if (!item.options?.optionGroups) return true;
    for (const group of item.options.optionGroups) {
      if (group.type === "single_required" && !selectedOptions[group.id]) {
        return false;
      }
    }
    return true;
  };

  const handleAddToCart = () => {
    if (!isValid()) return;
    onAddToCart(item, quantity, selectedOptions);
    onClose();
  };

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

          {/* Render option groups dinamis */}
          {item.options?.optionGroups?.map((group) => (
            <div className="mb-6" key={group.id}>
              <h4 className="font-bold text-lg mb-2 text-gray-800">
                {group.title}
              </h4>
              {group.description && (
                <div className="text-sm text-gray-500 mb-2">
                  {group.description}
                </div>
              )}
              <div className="space-y-3">
                {group.type.startsWith("single") &&
                  group.options.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => handleSelect(group, option)}
                      className={`w-full p-4 border-2 rounded-xl text-base flex justify-between items-center transition-all duration-200 ${
                        selectedOptions[group.id] === option.id
                          ? "border-orange-500 bg-orange-50 text-orange-500"
                          : "border-gray-200 hover:border-orange-300"
                      }`}
                    >
                      <span className="font-medium">{option.name}</span>
                      <span className="text-sm font-medium">
                        +{formatCurrency(option.extraPrice)}
                      </span>
                    </button>
                  ))}
                {group.type === "multiple_optional" && (
                  <>
                    {group.options.slice(0, 3).map((option) => (
                      <button
                        key={option.id}
                        onClick={() => handleSelect(group, option)}
                        className={`w-full p-4 border-2 rounded-xl text-base flex justify-between items-center transition-all duration-200 ${
                          Array.isArray(selectedOptions[group.id]) &&
                          (selectedOptions[group.id] as string[]).includes(
                            option.id
                          )
                            ? "border-orange-500 bg-orange-50 text-orange-500"
                            : "border-gray-200 hover:border-orange-300"
                        }`}
                      >
                        <span className="font-medium">{option.name}</span>
                        <span className="text-sm font-medium">
                          +{formatCurrency(option.extraPrice)}
                        </span>
                      </button>
                    ))}
                    {group.options.length > 3 && (
                      <>
                        {showAll[group.id] && (
                          <div className="space-y-3 mt-3">
                            {group.options.slice(3).map((option) => (
                              <button
                                key={option.id}
                                onClick={() => handleSelect(group, option)}
                                className={`w-full p-4 border-2 rounded-xl text-base flex justify-between items-center transition-all duration-200 ${
                                  Array.isArray(selectedOptions[group.id]) &&
                                  (
                                    selectedOptions[group.id] as string[]
                                  ).includes(option.id)
                                    ? "border-orange-500 bg-orange-50 text-orange-500"
                                    : "border-gray-200 hover:border-orange-300"
                                }`}
                              >
                                <span className="font-medium">
                                  {option.name}
                                </span>
                                <span className="text-sm font-medium">
                                  +{formatCurrency(option.extraPrice)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() =>
                            setShowAll((prev) => ({
                              ...prev,
                              [group.id]: !prev[group.id],
                            }))
                          }
                          className="w-full p-4 text-base text-orange-500 hover:text-orange-600 flex items-center justify-center gap-2"
                        >
                          {showAll[group.id] ? (
                            <>
                              <span>Tampilkan Lebih Sedikit</span>
                              <ChevronUp size={20} />
                            </>
                          ) : (
                            <>
                              <span>
                                Lihat {group.options.length - 3} Opsi Lainnya
                              </span>
                              <ChevronDown size={20} />
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
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
            disabled={!isValid()}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-200 ${
              isValid()
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
