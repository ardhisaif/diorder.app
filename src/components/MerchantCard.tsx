import React from "react";
import { Merchant } from "../types";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { isCurrentlyOpen } from "../utils/merchantUtils";
import LazyImage from "./LazyImage";

interface MerchantCardProps {
  merchant: Merchant;
  priority?: boolean;
  isServiceOpen?: boolean;
}

const MerchantCard: React.FC<MerchantCardProps> = ({
  merchant,
  priority = true,
  isServiceOpen = true,
}) => {
  const isOpen = merchant.is_open && isCurrentlyOpen(merchant.openingHours);
  const shouldBeGrayscale = !isOpen || !isServiceOpen;
  const navigate = useNavigate();

  return (
    <div
      className="bg-white rounded-lg shadow-md overflow-hidden mb-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => navigate(`/menu/${merchant.id}`)}
      role="button"
      tabIndex={0}
      style={{ userSelect: "none" }}
    >
      <div className="flex p-2">
        <LazyImage
          src={
            merchant.logo.startsWith("http")
              ? merchant.logo
              : "/placeholder.svg"
          }
          alt=""
          className={`w-20 h-20 rounded-lg object-cover ${
            shouldBeGrayscale ? "grayscale" : ""
          }`}
          loading="eager"
          priority={priority}
        />
        <div className="ml-4 flex-1 flex flex-col justify-center">
          <h3 className="font-bold text-lg">{merchant.name}</h3>
          <div className="flex items-center text-gray-600 text-sm mt-1">
            <MapPin size={14} className="mr-1" />
            <span>{merchant.address}</span>
          </div>
        </div>
      </div>
      <div
        className={`${
          isOpen && isServiceOpen
            ? "bg-orange-500 text-white"
            : "bg-gray-500 text-white"
        } py-2 px-4 text-center font-medium flex items-center justify-center`}
      >
        Lihat Menu
      </div>
    </div>
  );
};

export default MerchantCard;
