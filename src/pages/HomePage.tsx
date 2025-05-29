import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Merchant, MenuItem } from "../types";
import MerchantCardOrig from "../components/MerchantCard";
import Header from "../components/Header";
import SearchBar from "../components/SearchBar";
import ProductCardOrig from "../components/ProductCard";
import { ShoppingBag, WifiOff } from "lucide-react";
import { useCart } from "../context/CartContext";
import { useSettings } from "../context/SettingsContext";
import { useNavigate, useParams } from "react-router-dom";
import { isCurrentlyOpen } from "../utils/merchantUtils";
import supabase from "../utils/supabase/client";
import { indexedDBService } from "../utils/indexedDB";
import ServiceClosedBanner from "../components/ServiceClosedBanner";
import { MerchantSkeleton, ProductSkeleton } from "../components/Skeletons";
import { useAnnouncements } from "../context/AnnouncementContext";
import AnnouncementBanner from "../components/AnnouncementBanner";
// import { getLastFetchTime, updateLastFetchTime } from "../utils/cacheUtils";

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;
const HOME_LAST_FETCH_KEY = "diorder_home_last_fetch";

// Memoized components
const MerchantCard = React.memo(MerchantCardOrig);
const ProductCard = React.memo(ProductCardOrig);

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const HomePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<
    "merchants" | "makanan" | "minuman"
  >("merchants");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [menuData, setMenuData] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState<boolean>(!navigator.onLine);
  const { getTotalItems, getTotalPrice, calculateDeliveryFee } = useCart();
  const { isServiceOpen, refreshServiceStatus } = useSettings();
  const navigate = useNavigate();
  const { announcements, isLoading: announcementLoading } = useAnnouncements();
  const { merchantId } = useParams<{ merchantId: string }>();

  const totalItems = getTotalItems();
  const totalAmount = useMemo(() => getTotalPrice(), [getTotalPrice]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        await indexedDBService.initDB();

        // Get cached data
        const [cachedMerchants, cachedMenuItems] = await Promise.all([
          indexedDBService.getAll("merchantInfo"),
          indexedDBService.getAll("menuItems"),
        ]);

        // Show cached data immediately
        if (cachedMerchants.length > 0) {
          setMerchants(cachedMerchants);
        }
        if (cachedMenuItems.length > 0) {
          setMenuData(cachedMenuItems);
        }

        // Check if we need fresh data
        const lastFetchTime = localStorage.getItem(HOME_LAST_FETCH_KEY);
        const shouldCheckTimestamp =
          !lastFetchTime || Date.now() - Number(lastFetchTime) > CACHE_DURATION;

        if (
          navigator.onLine &&
          (shouldCheckTimestamp ||
            !cachedMerchants.length ||
            !cachedMenuItems.length)
        ) {
          // Fetch fresh data
          const [merchantsData, menuItemsData] = await Promise.all([
            supabase.from("merchants").select("*").eq("is_active", true),
            supabase.from("menu").select("*").eq("is_active", true),
          ]);

          // Update state and cache atomically
          if (merchantsData.data) {
            setMerchants(merchantsData.data);
            await indexedDBService.syncMerchants(merchantsData.data);
          }
          if (menuItemsData.data) {
            setMenuData(menuItemsData.data);
            await indexedDBService.syncMenus(
              menuItemsData.data,
              Number(merchantId)
            );
          }

          // Update timestamp
          localStorage.setItem(HOME_LAST_FETCH_KEY, Date.now().toString());
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [merchantId]);

  // Filtered products by search query
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return menuData;
    const normalizedQuery = searchQuery.toLowerCase();
    return menuData.filter(
      (item) =>
        item.name.toLowerCase().includes(normalizedQuery) ||
        item.category.toLowerCase().includes(normalizedQuery)
    );
  }, [menuData, searchQuery]);

  // Find merchant name by id
  const getMerchantName = useCallback(
    (merchantId: number): string => {
      const merchant = merchants.find((m) => m.id === merchantId);
      return merchant ? merchant.name : "";
    },
    [merchants]
  );

  // Add this function to determine if a merchant is open
  const isMerchantOpen = useCallback(
    (merchantId: number): boolean => {
      const merchant = merchants.find((m) => m.id === merchantId);
      return merchant
        ? isCurrentlyOpen(merchant.openingHours) && isServiceOpen
        : false;
    },
    [merchants, isServiceOpen]
  );

  // Sort merchants by open status (avoid mutating original array)
  const sortedMerchants = useMemo(() => {
    return merchants.slice().sort((a, b) => {
      const isOpenA = a.openingHours ? isCurrentlyOpen(a.openingHours) : false;
      const isOpenB = b.openingHours ? isCurrentlyOpen(b.openingHours) : false;
      if (isOpenA !== isOpenB) {
        return isOpenA ? -1 : 1; // buka di atas
      }
      // Jika sama-sama buka/tutup, urutkan point terbesar ke terkecil
      if ((a.point ?? 0) !== (b.point ?? 0)) {
        return (b.point ?? 0) - (a.point ?? 0);
      }
      // Jika point sama, urutkan nama A-Z
      return a.name.localeCompare(b.name);
    });
  }, [merchants]);

  // Sort products by merchant open status (avoid mutating original array)
  const sortProductsByMerchantOpenStatus = useCallback(
    (products: MenuItem[]) => {
      return products.slice().sort((a, b) => {
        const merchantA = merchants.find((m) => m.id === a.merchant_id);
        const merchantB = merchants.find((m) => m.id === b.merchant_id);
        const isOpenA = merchantA?.openingHours
          ? isCurrentlyOpen(merchantA.openingHours)
          : false;
        const isOpenB = merchantB?.openingHours
          ? isCurrentlyOpen(merchantB.openingHours)
          : false;
        return isOpenA === isOpenB ? 0 : isOpenA ? -1 : 1;
      });
    },
    [merchants]
  );

  // Filter and sort products by category
  const filteredMakanan = useMemo(() => {
    const makanan = filteredProducts.filter(
      (item) => item.category.toLowerCase() === "makanan"
    );
    return sortProductsByMerchantOpenStatus(makanan);
  }, [filteredProducts, sortProductsByMerchantOpenStatus]);

  const filteredMinuman = useMemo(() => {
    const minuman = filteredProducts.filter(
      (item) => item.category.toLowerCase() === "minuman"
    );
    return sortProductsByMerchantOpenStatus(minuman);
  }, [filteredProducts, sortProductsByMerchantOpenStatus]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // Handler untuk tombol keranjang
  const handleCartClick = useCallback(async () => {
    const open = await refreshServiceStatus();
    if (!open) {
      return;
    }
    navigate("/cart");
  }, [refreshServiceStatus, navigate]);

  // Handler untuk klik merchant card (lihat menu)
  const handleMerchantMenuClick = useCallback(
    async (merchantId: number) => {
      const open = await refreshServiceStatus();
      if (!open) {
        return;
      }
      navigate(`/menu/${merchantId}`);
    },
    [refreshServiceStatus, navigate]
  );

  return (
    <div className="min-h-screen bg-gray-100 pb-24">
      <Header title="diorder" />
      {!isServiceOpen && <ServiceClosedBanner className="mx-4 mt-4" />}

      {/* Announcements */}
      {!announcementLoading && announcements.length > 0 && (
        <div className="mx-4 mt-4 space-y-2">
          {announcements.map((announcement) => (
            <AnnouncementBanner
              key={announcement.id}
              announcement={announcement}
            />
          ))}
        </div>
      )}

      {isOffline && (
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mx-4 mt-4 flex items-center">
          <WifiOff size={20} className="mr-2" />
          <span>
            Anda sedang offline. Data yang ditampilkan adalah data terakhir yang
            tersimpan.
          </span>
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-center mb-4 space-x-2 sm:space-x-4">
          <button
            className={`px-4 sm:px-6 py-2 rounded-full font-semibold transition-all duration-300 transform ${
              activeTab === "merchants"
                ? "bg-orange-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setActiveTab("merchants")}
          >
            Resto
          </button>
          <button
            className={`px-4 sm:px-6 py-2 rounded-full font-semibold transition-all duration-300 transform ${
              activeTab === "makanan"
                ? "bg-orange-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setActiveTab("makanan")}
          >
            Makanan
          </button>
          <button
            className={`px-4 sm:px-6 py-2 rounded-full font-semibold transition-all duration-300 transform ${
              activeTab === "minuman"
                ? "bg-orange-500 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
            onClick={() => setActiveTab("minuman")}
          >
            Minuman
          </button>
        </div>

        <div className="transition-opacity duration-300">
          {(activeTab === "makanan" || activeTab === "minuman") && (
            <SearchBar
              onSearch={handleSearch}
              placeholder={`Cari ${
                activeTab === "makanan" ? "makanan" : "minuman"
              }...`}
            />
          )}

          {activeTab === "merchants" ? (
            <>
              <h2 className="text-xl font-bold mb-4">Daftar Resto</h2>
              <div className="grid gap-4">
                {isLoading
                  ? Array(4)
                      .fill(0)
                      .map((_, i) => <MerchantSkeleton key={i} />)
                  : sortedMerchants.map((merchant: Merchant, index) => (
                      <div
                        key={merchant.id}
                        onClick={() => handleMerchantMenuClick(merchant.id)}
                        style={{ cursor: "pointer" }}
                      >
                        <MerchantCard
                          merchant={merchant}
                          priority={index < 2} // Only make the first 2 merchant images high priority
                          isServiceOpen={isServiceOpen}
                        />
                      </div>
                    ))}
              </div>
            </>
          ) : activeTab === "makanan" ? (
            <>
              {isLoading ? (
                <div className="grid grid-cols-1 gap-4">
                  {Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <ProductSkeleton key={i} />
                    ))}
                </div>
              ) : filteredMakanan.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-lg shadow-md">
                  <p>Tidak ada makanan yang ditemukan.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredMakanan.map((product) => (
                    <ProductCard
                      key={product.id}
                      item={product}
                      merchantId={product.merchant_id}
                      merchantName={getMerchantName(product.merchant_id)}
                      isOpen={isMerchantOpen(product.merchant_id)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {isLoading ? (
                <div className="grid grid-cols-1 gap-4">
                  {Array(4)
                    .fill(0)
                    .map((_, i) => (
                      <ProductSkeleton key={i} />
                    ))}
                </div>
              ) : filteredMinuman.length === 0 ? (
                <div className="text-center p-8 bg-white rounded-lg shadow-md">
                  <p>Tidak ada minuman yang ditemukan.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredMinuman.map((product) => (
                    <ProductCard
                      key={product.id}
                      item={product}
                      merchantId={product.merchant_id}
                      merchantName={getMerchantName(product.merchant_id)}
                      isOpen={isMerchantOpen(product.merchant_id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {totalItems > 0 && totalAmount > 0 && isServiceOpen && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4">
          <div className="container mx-auto max-w-md">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span>Subtotal</span>
                  <span className="pl-2">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Ongkir</span>
                  <span className="pl-2">
                    {calculateDeliveryFee() === -1
                      ? "Nego"
                      : formatCurrency(calculateDeliveryFee())}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <span className="text-gray-600">Total Pesanan:</span>
                <div className="font-bold text-lg">
                  {formatCurrency(
                    totalAmount +
                      (calculateDeliveryFee() === -1
                        ? 0
                        : calculateDeliveryFee())
                  )}
                </div>
              </div>
              <button
                onClick={handleCartClick}
                className="bg-orange-500 text-white px-6 py-3 rounded-lg font-bold flex items-center"
              >
                <ShoppingBag className="mr-2" size={20} />
                <span>Keranjang ({totalItems})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
