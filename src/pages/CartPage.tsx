import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import CartItem from "../components/CartItem";
import Header from "../components/Header";
import supabase from "../utils/supabase/client";
import { Plus } from "lucide-react";
import { isCurrentlyOpen } from "../utils/merchantUtils";
import { Merchant } from "../types";
import { CartItemSkeleton } from "../components/Skeletons";
import { useSettings } from "../context/SettingsContext";
import CustomAlert from "../components/CustomAlert";
import { indexedDBService } from "../utils/indexedDB";

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER;

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

// Sort villages by shipping cost
const VILLAGES = Object.entries(VILLAGE_SHIPPING_COSTS)
  .sort((a, b) => a[0].localeCompare(b[0]))
  .map(([village]) => village);

const CartPage: React.FC = () => {
  const {
    getMerchantItems,
    getMerchantTotalPrice,
    customerInfo,
    setCustomerInfo,
    clearCart,
    calculateDeliveryFee,
  } = useCart();
  const navigate = useNavigate();
  const { isServiceOpen } = useSettings();
  const [merchantsWithItems, setMerchantsWithItems] = useState<Merchant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [showValidation, setShowValidation] = useState(false);

  // Redirect ke home jika layanan tutup
  useEffect(() => {
    if (!isServiceOpen) {
      navigate("/", { replace: true });
    }
  }, [isServiceOpen, navigate]);

  // Load merchant data from IndexedDB
  useEffect(() => {
    const loadMerchantInfo = async () => {
      try {
        const merchants = await indexedDBService.getMerchantInfo();
        // Filter hanya merchant yang memiliki item di cart
        const merchantsWithCartItems = merchants.filter(
          (merchant: Merchant) => getMerchantItems(merchant.id).length > 0
        );
        setMerchantsWithItems(merchantsWithCartItems);
      } catch (error) {
        console.error("Error loading merchant info from IndexedDB:", error);
        setMerchantsWithItems([]);
      }
    };

    loadMerchantInfo();
  }, [getMerchantItems]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    // console.log("Input changed:", { name, value });

    if (name === "village" && value === "Desa Lain") {
      // Tampilkan alert untuk desa di luar area
      setAlertMessage(
        "Anda memilih desa lain di luar daftar. Promo ongkir Rp5.000 tidak berlaku. Ongkir akan dibicarakan dengan kurir setelah pemesanan."
      );
      setShowAlert(true);

      // Update customer info dengan desa kustom
      setCustomerInfo({
        ...customerInfo,
        [name]: "Desa Lain",
        isCustomVillage: true,
        needsNegotiation: true,
      });
    } else if (name === "customVillage") {
      setCustomerInfo({
        ...customerInfo,
        customVillage: value,
        isCustomVillage: true,
        needsNegotiation: true,
      });
    } else {
      // Pertahankan status desa kustom saat mengubah field lain
      setCustomerInfo({
        ...customerInfo,
        [name]: value,
        // Hanya reset status desa kustom jika mengubah field village ke desa yang valid
        isCustomVillage:
          name === "village" && value !== "Desa Lain"
            ? false
            : customerInfo.isCustomVillage,
        needsNegotiation:
          name === "village" && value !== "Desa Lain"
            ? false
            : customerInfo.needsNegotiation,
      });
    }
  };

  const handleCheckout = () => {
    if (
      !customerInfo.name ||
      !customerInfo.village ||
      !customerInfo.addressDetail
    ) {
      setShowValidation(true);
      setAlertMessage("Mohon lengkapi data pengiriman");
      setShowAlert(true);
      // Add auto-scroll to the top of the page
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setIsLoading(true);

    const subtotal = merchantsWithItems.reduce((total, merchant) => {
      if (isCurrentlyOpen(merchant.openingHours)) {
        return total + getMerchantTotalPrice(merchant.id);
      }
      return total;
    }, 0);

    const deliveryFee = calculateDeliveryFee();
    const totalWithDelivery = subtotal + (deliveryFee === -1 ? 0 : deliveryFee);

    // Format the order message for WhatsApp
    let message = `*🛍️ PESANAN BARU 🛍️*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    // Informasi Pelanggan
    message += `*👤 INFORMASI PELANGGAN*\n`;
    message += `- *Nama:* ${customerInfo.name}\n`;
    message += `- *Kecamatan:* Duduksampeyan\n`;
    message += `- *Desa:* ${
      customerInfo.isCustomVillage
        ? customerInfo.customVillage
        : customerInfo.village
    }\n`;
    message += `- *Detail Alamat:* ${customerInfo.addressDetail}\n\n`;

    // Detail Pesanan
    message += `*🍽️ DETAIL PESANAN*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    // Add orders from each merchant
    merchantsWithItems.forEach((merchant) => {
      if (isCurrentlyOpen(merchant.openingHours)) {
        const items = getMerchantItems(merchant.id);
        const merchantSubtotal = getMerchantTotalPrice(merchant.id);

        message += `*🏪 ${merchant.name}:*\n`;
        items.forEach((item) => {
          message += `• *${item.name}* (${item.quantity}x)\n`;

          // Add base price
          message += `   *Harga Dasar:* ${formatCurrency(item.price)}\n`;

          // Add all selected options
          if (item.selectedOptions) {
            // Add variant if exists
            if (item.selectedOptions.variant) {
              message += `   *${
                item.selectedOptions.variant.label
              }:* ${formatCurrency(item.selectedOptions.variant.extraPrice)}\n`;
            }

            // Add level if exists
            if (item.selectedOptions.level) {
              message += `   *${
                item.selectedOptions.level.label
              }:* ${formatCurrency(item.selectedOptions.level.extraPrice)}\n`;
            }

            // Add toppings if any
            if (
              item.selectedOptions.toppings &&
              item.selectedOptions.toppings.length > 0
            ) {
              message += `   *Topping:*\n`;
              item.selectedOptions.toppings.forEach((topping) => {
                message += `    - ${topping.label} (+${formatCurrency(
                  topping.extraPrice
                )})\n`;
              });
            }
          }

          // Calculate and add subtotal for this item
          const itemTotal =
            item.price * item.quantity +
            (item.selectedOptions?.variant?.extraPrice || 0) * item.quantity +
            (item.selectedOptions?.level?.extraPrice || 0) * item.quantity +
            (item.selectedOptions?.toppings?.reduce(
              (sum, t) => sum + t.extraPrice,
              0
            ) || 0) *
              item.quantity;

          message += `   *Subtotal per item:* ${formatCurrency(itemTotal)}\n\n`;
        });
        message += `*Subtotal* ${merchant.name}: *${formatCurrency(
          merchantSubtotal
        )}*\n\n`;
      }
    });

    // Ringkasan Pembayaran
    message += `*💰 RINGKASAN PEMBAYARAN*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `• *Subtotal:* ${formatCurrency(subtotal)}\n`;
    if (customerInfo.isCustomVillage && customerInfo.needsNegotiation) {
      message += `• *Ongkir:* Perlu Negosiasi\n`;
    } else {
      message += `• *Ongkir:* ${formatCurrency(deliveryFee)}\n`;
    }
    message += `*TOTAL PEMBAYARAN: ${formatCurrency(totalWithDelivery)}*\n\n`;

    if (customerInfo.notes) {
      message += `*📝 CATATAN*\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `${customerInfo.notes}\n\n`;
    }

    message += `Terima kasih telah memesan! 🙏\n`;
    message += `Pesanan Anda akan segera kami proses. ⏳`;

    // Track checkout event with Google Analytics
    const trackCheckoutEvent = () => {
      // Generate a simple order ID using timestamp and random string
      const orderId = `ORD-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      // Create transaction data
      const transactionData = {
        transaction_id: orderId,
        value: totalWithDelivery,
        currency: "IDR",
        shipping: deliveryFee,
        items: merchantsWithItems.flatMap((merchant) => {
          if (isCurrentlyOpen(merchant.openingHours)) {
            const items = getMerchantItems(merchant.id);
            return items.map((item) => ({
              item_id: `${merchant.id}-${item.id}`,
              item_name: item.name,
              price: item.price,
              quantity: item.quantity,
              merchant_id: merchant.id,
              merchant_name: merchant.name,
            }));
          }
          return [];
        }),
      };

      try {
        // Check if gtag function exists (window.gtag)
        if (typeof window.gtag !== "undefined") {
          // Track the purchase event
          window.gtag("event", "purchase", transactionData);

          // Also track a custom checkout completed event
          window.gtag("event", "checkout_completed", {
            customer_village: customerInfo.village,
            order_id: orderId,
            order_value: totalWithDelivery,
            item_count: transactionData.items.length,
            merchant_count: merchantsWithItems.filter((m) =>
              isCurrentlyOpen(m.openingHours)
            ).length,
          });
        }
      } catch {
        // Don't block checkout process if tracking fails
      }
    };

    // Track the event
    trackCheckoutEvent();

    // --- ASYNC SAVE TO SUPABASE (FIRE AND FORGET) ---
    (async () => {
      try {
        await supabase.from("orders").insert([
          {
            customer_name: customerInfo.name,
            address: JSON.stringify({
              village: customerInfo.isCustomVillage
                ? customerInfo.customVillage
                : customerInfo.village,
              addressDetail: customerInfo.addressDetail,
              isCustomVillage: customerInfo.isCustomVillage,
              needsNegotiation: customerInfo.needsNegotiation,
            }),
            items: JSON.stringify(
              merchantsWithItems.map((merchant) => ({
                merchant_id: merchant.id,
                merchant_name: merchant.name,
                items: getMerchantItems(merchant.id),
              }))
            ),
            notes: customerInfo.notes || null,
            delivery_fee: deliveryFee,
          },
        ]);
        // --- ASYNC UPDATE POINTS (FIRE AND FORGET) ---
        (async () => {
          try {
            // Update point menu
            for (const merchant of merchantsWithItems) {
              if (isCurrentlyOpen(merchant.openingHours)) {
                const items = getMerchantItems(merchant.id);
                for (const item of items) {
                  // Increment point menu secara atomic
                  await supabase.rpc("increment_menu_point", {
                    menu_id: item.id,
                    increment_by: item.quantity,
                  });
                }
              }
            }
            // Update point merchant
            for (const merchant of merchantsWithItems) {
              if (isCurrentlyOpen(merchant.openingHours)) {
                const merchantSubtotal = getMerchantTotalPrice(merchant.id);
                const addPoint = Math.floor(merchantSubtotal / 1000);
                if (addPoint > 0) {
                  // Increment point merchant secara atomic
                  await supabase.rpc("increment_merchant_point", {
                    merchant_id: merchant.id,
                    increment_by: addPoint,
                  });
                }
              }
            }
          } catch (err) {
            console.error("Gagal update point menu/merchant:", err);
          }
        })();
      } catch (err) {
        // Tidak perlu notifikasi user, hanya log error
        console.error("Gagal menyimpan pesanan ke database:", err);
      }
    })();
    // --- END ASYNC SAVE ---

    // Encode the message for the URL
    const encodedMessage = encodeURIComponent(message);

    // Open WhatsApp with the formatted message
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`,
      "_blank"
    );

    // Clear the entire cart after checkout
    clearCart();
    navigate("/");
    setIsLoading(false);
  };

  const renderShippingForm = () => (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h2 className="text-lg font-bold mb-4">Informasi Pengiriman</h2>
      <div className="mb-4">
        <label
          className="block text-gray-700 text-sm font-bold mb-2"
          htmlFor="name"
        >
          Nama Pemesan <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={customerInfo.name || ""}
          onChange={handleInputChange}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            showValidation && !customerInfo.name ? "border-red-500" : ""
          }`}
          placeholder="Masukkan nama Anda"
          required
        />
        {showValidation && !customerInfo.name && (
          <p className="text-red-500 text-xs mt-1">
            Silakan masukkan nama pemesan
          </p>
        )}
      </div>

      <div className="mb-4">
        <label
          className="block text-gray-700 text-sm font-bold mb-2"
          htmlFor="village"
        >
          Desa <span className="text-red-500">*</span>
        </label>
        <select
          id="village"
          name="village"
          value={customerInfo.village || ""}
          onChange={handleInputChange}
          className={`shadow border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            showValidation && !customerInfo.village ? "border-red-500" : ""
          }`}
          required
        >
          <option value="">Pilih Desa</option>
          {VILLAGES.map((village) => (
            <option key={village} value={village}>
              {village.padEnd(40, " ")}
            </option>
          ))}
          <option value="Desa Lain">Desa Lain (Ongkir Nego)</option>
        </select>
        {showValidation && !customerInfo.village && (
          <p className="text-red-500 text-xs mt-1">
            Silakan pilih desa pengiriman
          </p>
        )}
      </div>

      {customerInfo.isCustomVillage && (
        <div className="mb-4">
          <label
            className="block text-gray-700 text-sm font-bold mb-2"
            htmlFor="customVillage"
          >
            Nama Desa <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="customVillage"
            name="customVillage"
            value={customerInfo.customVillage || ""}
            onChange={handleInputChange}
            className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
              showValidation && !customerInfo.customVillage
                ? "border-red-500"
                : ""
            }`}
            placeholder="Masukkan nama desa Anda"
            required
          />
          {showValidation && !customerInfo.customVillage && (
            <p className="text-red-500 text-xs mt-1">
              Silakan masukkan nama desa
            </p>
          )}
        </div>
      )}

      <div className="mb-4">
        <label
          className="block text-gray-700 text-sm font-bold mb-2"
          htmlFor="addressDetail"
        >
          Detail Alamat <span className="text-red-500">*</span>
        </label>
        <textarea
          id="addressDetail"
          name="addressDetail"
          value={customerInfo.addressDetail || ""}
          onChange={handleInputChange}
          className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
            showValidation && !customerInfo.addressDetail
              ? "border-red-500"
              : ""
          }`}
          placeholder="Masukkan detail alamat (RT/RW, nama gang, warna pagar, dll)"
          rows={3}
          required
        />
        {showValidation && !customerInfo.addressDetail && (
          <p className="text-red-500 text-xs mt-1">
            Silakan masukkan detail alamat
          </p>
        )}
      </div>

      <div className="mb-4">
        <label
          className="block text-gray-700 text-sm font-bold mb-2"
          htmlFor="notes"
        >
          Catatan Tambahan
        </label>
        <textarea
          id="notes"
          name="notes"
          value={customerInfo.notes || ""}
          onChange={handleInputChange}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          placeholder="Catatan tambahan untuk pesanan Anda"
          rows={3}
        />
      </div>
    </div>
  );

  const renderMerchantItems = (merchant: Merchant) => {
    const items = getMerchantItems(merchant.id);
    const merchantSubtotal = getMerchantTotalPrice(merchant.id);
    const isOpen = isCurrentlyOpen(merchant.openingHours);

    return (
      <div
        key={merchant.id}
        className={`bg-white rounded-lg shadow-md p-4 mb-6 ${
          isOpen ? "" : "filter grayscale"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{merchant.name}</h2>
          <button
            onClick={() => navigate(`/menu/${merchant.id}`)}
            className="text-orange-500 flex items-center text-sm"
          >
            <Plus size={16} className="mr-1" />
            Tambah Menu
          </button>
        </div>

        {items.map((item) => {
          // Create a unique key based on item ID and options
          const itemKey = item.selectedOptions
            ? `${item.id}-${item.selectedOptions.level?.value || ""}-${
                item.selectedOptions.toppings
                  ?.map((t) => t.value)
                  .sort()
                  .join("-") || ""
              }`
            : item.id.toString();

          return (
            <CartItem key={itemKey} item={item} merchantId={merchant.id} />
          );
        })}

        <div className="mt-4 pt-4">
          <div className="flex justify-between mb-2">
            <span>Subtotal</span>
            <span className="font-bold">
              {formatCurrency(merchantSubtotal)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const cartEmpty = merchantsWithItems.length === 0;
  const subtotal = merchantsWithItems.reduce((total, merchant) => {
    if (isCurrentlyOpen(merchant.openingHours)) {
      return total + getMerchantTotalPrice(merchant.id);
    }
    return total;
  }, 0);
  const deliveryFee = calculateDeliveryFee();
  const totalWithDelivery = subtotal + (deliveryFee === -1 ? 0 : deliveryFee);

  return (
    <div className="min-h-screen bg-gray-100 pb-32">
      <Header title="Keranjang" showBack />
      {showAlert && (
        <CustomAlert
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />
      )}
      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <>
            {renderShippingForm()}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/5"></div>
              </div>
              <CartItemSkeleton />
              <CartItemSkeleton />
              <div className="mt-4 pt-4">
                <div className="flex justify-between mb-2">
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {renderShippingForm()}
            {merchantsWithItems.map((merchant) =>
              renderMerchantItems(merchant)
            )}
          </>
        )}
      </div>

      {!cartEmpty && subtotal > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="container mx-auto max-w-md">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span>Subtotal</span>
                  <span className="pl-2">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ongkir</span>
                  <span className="pl-2">
                    {deliveryFee === -1 ? " Nego" : formatCurrency(deliveryFee)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-600">Total Pesanan:</span>
                <div className="font-bold text-lg">
                  {formatCurrency(totalWithDelivery)}
                </div>
              </div>
              <button
                onClick={handleCheckout}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg font-bold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Memuat...
                  </span>
                ) : (
                  "Buat Pesanan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
