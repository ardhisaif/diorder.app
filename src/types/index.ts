export interface Merchant {
  id: number;
  name: string;
  address: string;
  logo: string;
  openingHours: {
    open: string;
    close: string;
  };
  updated_at: string;
}

export interface MenuItem {
  id: number;
  merchant_id: number;
  name: string;
  price: number;
  image: string;
  category: string;
  is_active: boolean;
  options?: {
    optionGroups: MenuOptionGroup[];
  };
  selectedOptions?: {
    [groupId: string]: string | string[];
  };
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

export interface CustomerInfo {
  name: string;
  address: string;
  notes: string;
  phone?: string;
  village?: string;
  addressDetail?: string;
  isCustomVillage?: boolean;
  customVillage?: string;
  needsNegotiation?: boolean;
}

export interface MenuOption {
  id: string;
  name: string;
  extraPrice: number;
}

export type OptionGroupType =
  | "single_required"
  | "multiple_optional"
  | "single_optional";

export interface MenuOptionGroup {
  id: string;
  title: string;
  type: OptionGroupType;
  description?: string;
  maxSelections?: number;
  options: MenuOption[];
}
