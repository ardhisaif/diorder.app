import React from "react";
import { Clock, Gift, Star, Info, AlertTriangle } from "lucide-react";
import { Announcement, AnnouncementType } from "../types/announcement";

interface AnnouncementBannerProps {
  announcement: Announcement;
  className?: string;
}

const getAnnouncementStyle = (type: AnnouncementType) => {
  switch (type) {
    case "operational":
      return {
        bg: "bg-blue-100",
        border: "border-blue-500",
        text: "text-blue-700",
        icon: <Clock className="mr-2" size={20} />,
      };
    case "holiday":
      return {
        bg: "bg-red-100",
        border: "border-red-500",
        text: "text-red-700",
        icon: <AlertTriangle className="mr-2" size={20} />,
      };
    case "promotion":
      return {
        bg: "bg-green-100",
        border: "border-green-500",
        text: "text-green-700",
        icon: <Gift className="mr-2" size={20} />,
      };
    case "new_feature":
      return {
        bg: "bg-purple-100",
        border: "border-purple-500",
        text: "text-purple-700",
        icon: <Star className="mr-2" size={20} />,
      };
    default:
      return {
        bg: "bg-gray-100",
        border: "border-gray-500",
        text: "text-gray-700",
        icon: <Info className="mr-2" size={20} />,
      };
  }
};

const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  announcement,
  className = "",
}) => {
  const style = getAnnouncementStyle(announcement.type);

  return (
    <div
      className={`${style.bg} border-l-4 ${style.border} ${style.text} p-4 ${className}`}
    >
      <div className="flex items-center">
        {style.icon}
        <div>
          <p className="font-bold">{announcement.title}</p>
          <p>{announcement.content}</p>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementBanner;
