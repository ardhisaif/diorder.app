export type AnnouncementType =
  | "operational"
  | "holiday"
  | "promotion"
  | "pre_order"
  | "new_feature"
  | "info"
  | "warning";

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: AnnouncementType;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_showed: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}
