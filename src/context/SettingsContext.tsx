import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import supabase from "../utils/supabase/client";
import {
  updateStoredTimestamp,
  TIMESTAMP_KEYS,
  HOME_LAST_FETCH_KEY,
  resetLastFetchTime,
  resetAllMerchantTimestamps,
  resetMenuTimestamp,
} from "../utils/cacheUtils";
import { isCurrentlyOpen } from "../utils/merchantUtils";

interface SettingsContextType {
  isServiceOpen: boolean;
  loading: boolean;
  refreshServiceStatus: () => Promise<boolean>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isServiceOpen, setIsServiceOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // Fungsi yang bisa dipanggil dari luar untuk cek status layanan (fresh dari DB)
  const refreshServiceStatus = async (): Promise<boolean> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("settings")
        .select("is_open, opening_hours, updated_at")
        .single();

      if (error) {
        setIsServiceOpen(true);
        return true;
      } else {
        // Cek jam operasional
        let open = false;
        if (data.is_open && data.opening_hours) {
          // opening_hours bisa string (json) atau object
          let openingHoursObj = data.opening_hours;
          if (typeof openingHoursObj === "string") {
            try {
              openingHoursObj = JSON.parse(openingHoursObj);
            } catch {
              openingHoursObj = null;
            }
          }
          if (
            openingHoursObj &&
            openingHoursObj.open &&
            openingHoursObj.close
          ) {
            open = isCurrentlyOpen(openingHoursObj);
          }
        }
        const isOpenNow = data.is_open && open;
        setIsServiceOpen(isOpenNow);

        const prevSettingsTimestamp = localStorage.getItem(
          TIMESTAMP_KEYS.SETTINGS
        );

        if (data.updated_at && prevSettingsTimestamp !== data.updated_at) {
          resetLastFetchTime(HOME_LAST_FETCH_KEY);
          resetAllMerchantTimestamps();
          resetMenuTimestamp();
        }
        return isOpenNow;
      }
    } catch {
      setIsServiceOpen(true);
      return true;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);

        // Always fetch fresh service status from database
        const { data, error } = await supabase
          .from("settings")
          .select("is_open, opening_hours, updated_at")
          .single();

        if (error) {
          // Default to open if there's an error
          setIsServiceOpen(true);
        } else {
          // Cek jam operasional
          let open = false;
          if (data.is_open && data.opening_hours) {
            let openingHoursObj = data.opening_hours;
            if (typeof openingHoursObj === "string") {
              try {
                openingHoursObj = JSON.parse(openingHoursObj);
              } catch {
                openingHoursObj = null;
              }
            }
            if (
              openingHoursObj &&
              openingHoursObj.open &&
              openingHoursObj.close
            ) {
              open = isCurrentlyOpen(openingHoursObj);
            }
          }
          const isOpenNow = data.is_open && open;
          setIsServiceOpen(isOpenNow);

          // Check if timestamp changed for cache invalidation
          const prevSettingsTimestamp = localStorage.getItem(
            TIMESTAMP_KEYS.SETTINGS
          );

          if (data.updated_at && prevSettingsTimestamp !== data.updated_at) {
            // Reset caches to force fresh data fetching
            resetLastFetchTime(HOME_LAST_FETCH_KEY);
            resetAllMerchantTimestamps();
            resetMenuTimestamp();
          }
        }
      } catch {
        // Default to open in case of any error
        setIsServiceOpen(true);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider
      value={{ isServiceOpen, loading, refreshServiceStatus }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
