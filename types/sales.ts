export interface Product {
  id: number;
  name: string;
  category: string;
  wholesalePrice: number;
  imageUri?: string;
  thumbnailUris?: string[];
  originalPrice?: number;
  outOfStock?: boolean;
}

export interface Store {
  id: number;
  name: string;
  address: string;
  imageUri?: string;
}

export interface OrderItem {
  product: Product;
  quantity: number;
}

export interface CheckedOutOrder {
  id: number;
  customerName: string;
  storeName: string;
  address: string;
  mobileNumber: string;
  items: OrderItem[];
  total: number;
  createdAt: string;
  status?: 'pending' | 'delivered';
}

export type StoreDetailRouteParams = {
  category: string;
};
