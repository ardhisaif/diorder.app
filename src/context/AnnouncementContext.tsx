import React, { createContext, useContext, useState, useEffect } from "react";
import supabase from "../utils/supabase/client";
import { Announcement } from "../types/announcement";

interface AnnouncementContextType {
  announcements: Announcement[];
  isLoading: boolean;
  error: Error | null;
}

const AnnouncementContext = createContext<AnnouncementContextType>({
  announcements: [],
  isLoading: false,
  error: null,
});

export const AnnouncementProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .eq("is_active", true)
          .eq("is_showed", true)
          .gte("end_date", new Date().toISOString())
          .lte("start_date", new Date().toISOString())
          .order("priority", { ascending: false });

        if (error) throw error;
        setAnnouncements(data || []);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  return (
    <AnnouncementContext.Provider value={{ announcements, isLoading, error }}>
      {children}
    </AnnouncementContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAnnouncements = () => useContext(AnnouncementContext);
