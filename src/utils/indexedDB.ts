import { MenuItem, CartItem, Merchant } from "../types";

const DB_NAME = "diorderFoodDB";
const DB_VERSION = 5; // Increased version number to trigger upgrade

interface DBSchema {
  menuItems: MenuItem[];
  cartItems: CartItem[];
  merchantInfo: Merchant[];
}

interface DBItem extends CartItem {
  itemKey: string;
}

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Delete existing stores to ensure clean upgrade
        if (db.objectStoreNames.contains("menuItems")) {
          db.deleteObjectStore("menuItems");
        }
        if (db.objectStoreNames.contains("cartItems")) {
          db.deleteObjectStore("cartItems");
        }
        if (db.objectStoreNames.contains("merchantInfo")) {
          db.deleteObjectStore("merchantInfo");
        }

        // Create object stores with proper configuration
        const menuStore = db.createObjectStore("menuItems", {
          keyPath: "id",
          autoIncrement: true,
        });
        menuStore.createIndex("by_merchant", "merchant_id", {
          unique: false,
        });

        // Create cart store with composite key
        const cartStore = db.createObjectStore("cartItems", {
          keyPath: ["id", "merchant_id", "itemKey"],
        });
        cartStore.createIndex("by_merchant", "merchant_id", {
          unique: false,
        });

        db.createObjectStore("merchantInfo", {
          keyPath: "id",
          autoIncrement: true,
        });
      };
    });
  }

  private getStore(storeName: string, mode: IDBTransactionMode = "readonly") {
    if (!this.db) {
      throw new Error("Database not initialized");
    }
    const transaction = this.db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Generic get all items from a store
  async getAll<T extends keyof DBSchema>(storeName: T): Promise<DBSchema[T]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName);
      const request = store.getAll();

      request.onerror = () => {
        // console.error("Database error:", event);
        reject(request.error);
      };
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Generic add item to a store
  async add<T extends keyof DBSchema>(
    storeName: T,
    item: DBSchema[T][number]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, "readwrite");
      const request = store.add(item);

      request.onerror = () => {
        // console.error("Database error:", event);
        reject(request.error);
      };
      request.onsuccess = () => resolve();
    });
  }

  // Generic update item in a store
  async update<T extends keyof DBSchema>(
    storeName: T,
    item: DBSchema[T][number]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, "readwrite");
      const request = store.put(item);

      request.onerror = () => {
        // console.error("Database error:", event);
        reject(request.error);
      };
      request.onsuccess = () => resolve();
    });
  }

  // Generic delete item from a store
  async delete<T extends keyof DBSchema>(
    storeName: T,
    id: string | number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const store = this.getStore(storeName, "readwrite");
      const request = store.delete(id);

      request.onerror = () => {
        // console.error("Database error:", event);
        reject(request.error);
      };
      request.onsuccess = () => resolve();
    });
  }

  // Cart methods
  async addToCart(item: CartItem): Promise<void> {
    const store = this.getStore("cartItems", "readwrite");
    return new Promise((resolve, reject) => {
      // Create a unique key for the item based on its options
      const itemKey = item.selectedOptions
        ? `${item.selectedOptions.level?.value || ""}-${
            item.selectedOptions.toppings
              ?.map((t) => t.value)
              .sort()
              .join("-") || ""
          }`
        : "default";

      // Add the item with its unique key
      const request = store.put({
        ...item,
        itemKey,
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getCart(): Promise<CartItem[]> {
    const store = this.getStore("cartItems");
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        // Ensure the returned items have the correct structure
        const items = request.result.map((item: DBItem) => ({
          ...item,
          selectedOptions: item.selectedOptions
            ? {
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
        }));
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async removeFromCart(
    id: number,
    merchantId: number,
    itemKey: string
  ): Promise<void> {
    const store = this.getStore("cartItems", "readwrite");
    return new Promise((resolve, reject) => {
      const request = store.delete([id, merchantId, itemKey]);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearCart(): Promise<void> {
    const store = this.getStore("cartItems", "readwrite");
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Add method to remove deleted merchants and their associated data
  async removeMerchantAndData(merchantId: number): Promise<void> {
    const merchantStore = this.getStore("merchantInfo", "readwrite");
    const menuStore = this.getStore("menuItems", "readwrite");
    const cartStore = this.getStore("cartItems", "readwrite");

    return new Promise((resolve, reject) => {
      try {
        // Remove merchant
        const merchantRequest = merchantStore.delete(merchantId);

        // Remove menu items for this merchant
        const menuIndex = menuStore.index("by_merchant");
        const menuRange = IDBKeyRange.only(merchantId);
        const menuRequest = menuIndex.openCursor(menuRange);

        menuRequest.onsuccess = () => {
          const cursor = menuRequest.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };

        // Remove cart items for this merchant
        const cartIndex = cartStore.index("by_merchant");
        const cartRange = IDBKeyRange.only(merchantId);
        const cartRequest = cartIndex.openCursor(cartRange);

        cartRequest.onsuccess = () => {
          const cursor = cartRequest.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };

        merchantRequest.onsuccess = () => resolve();
        merchantRequest.onerror = () => reject(merchantRequest.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Add method to sync merchants with server data
  async syncMerchants(serverMerchants: Merchant[]): Promise<void> {
    const cachedMerchants = await this.getAll("merchantInfo");

    return new Promise((resolve, reject) => {
      try {
        // Find merchants that exist in cache but not in server data (deleted merchants)
        const deletedMerchantIds = cachedMerchants
          .filter(
            (cached) =>
              !serverMerchants.some((server) => server.id === cached.id)
          )
          .map((merchant) => merchant.id);

        // Remove deleted merchants and their data
        const removePromises = deletedMerchantIds.map((id) =>
          this.removeMerchantAndData(id)
        );

        // Update or add new merchants
        const updatePromises = serverMerchants.map((merchant) =>
          this.update("merchantInfo", merchant)
        );

        Promise.all([...removePromises, ...updatePromises])
          .then(() => resolve())
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Methods for menu items
  async cacheMenuItems(items: MenuItem[], merchantId: number): Promise<void> {
    const store = this.getStore("menuItems", "readwrite");
    return new Promise((resolve, reject) => {
      try {
        // Delete existing menu items for this merchant
        const index = store.index("by_merchant");
        const range = IDBKeyRange.only(merchantId);
        const deleteRequest = index.openCursor(range);

        deleteRequest.onsuccess = () => {
          const cursor = deleteRequest.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            // All existing items deleted, now add new ones
            const addPromises = items.map((item) => {
              const itemWithMerchant = { ...item, merchant_id: merchantId };
              return this.update("menuItems", itemWithMerchant);
            });

            Promise.all(addPromises)
              .then(() => resolve())
              .catch(reject);
          }
        };

        deleteRequest.onerror = () => reject(deleteRequest.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async getMenuItems(merchantId: number): Promise<MenuItem[]> {
    return new Promise((resolve, reject) => {
      const store = this.getStore("menuItems");
      const index = store.index("by_merchant");
      const range = IDBKeyRange.only(merchantId);
      const request = index.getAll(range);

      request.onerror = () => {
        // console.error("Database error:", event);
        reject(request.error);
      };
      request.onsuccess = () => resolve(request.result);
    });
  }

  async getMerchantInfo(): Promise<Merchant[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction(["merchantInfo"], "readonly");
      const store = transaction.objectStore("merchantInfo");
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // Add method to sync menu items with server data
  async syncMenus(serverMenuItems: MenuItem[]): Promise<void> {
    const cachedMenuItems = await this.getAll("menuItems");
    console.log("cachedMenuItems", cachedMenuItems);
    return new Promise((resolve, reject) => {
      try {
        // Find menu items that exist in cache but not in server data (deleted items)
        const deletedMenuItemIds = cachedMenuItems
          .filter(
            (cached) =>
              !serverMenuItems.some((server) => server.id === cached.id)
          )
          .map((item) => item.id);

        // Remove deleted menu items
        const removePromises = deletedMenuItemIds.map((id) =>
          this.delete("menuItems", id)
        );

        // Update or add new menu items
        const updatePromises = serverMenuItems.map((item) => {
          const itemWithMerchant = { ...item, merchant_id: merchantId };
          return this.update("menuItems", itemWithMerchant);
        });

        Promise.all([...removePromises, ...updatePromises])
          .then(() => resolve())
          .catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }
}

export const indexedDBService = new IndexedDBService();
