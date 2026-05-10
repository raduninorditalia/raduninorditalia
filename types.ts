
export enum View {
  HOME = 'HOME',
  CARSPOTTING = 'CARSPOTTING',
  EVENTI = 'EVENTI',
  ADMIN_PANEL = 'ADMIN_PANEL'
}

export enum UserRole {
  USER = 'user',
  ORGANIZER = 'organizer',
  ADMIN = 'admin'
}

export interface Location {
  lat?: number;
  lng?: number;
  address?: string;
}

export interface Spot {
  id?: string;
  car_model: string;
  location: string;
  location_data?: Location;
  spotted_by: string;
  image_data: string;
  created_at: string;
}

export interface Event {
  id?: string;
  title: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  address: string;
  maps_link: string;
  instagram_post_link?: string;
  is_dynamic: boolean;
  paid_visitors: boolean;
  paid_exhibitors: boolean;
  reg_at_entrance_visitors: boolean;
  reg_at_entrance_exhibitors: boolean;
  reg_link_visitors?: string;
  reg_link_exhibitors?: string;
  description: string;
  poster_url?: string;
  created_by: string;
}

export interface User {
  isLoggedIn: boolean;
  username?: string;
  role?: UserRole;
  email?: string;
  id?: string;
  following?: string[];
}
