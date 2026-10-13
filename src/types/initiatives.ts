// Marketing initiatives — mirrors backend models/initiative_model.py

export type InitiativeStatus = "PLANNED" | "ACTIVE" | "COMPLETED" | "PAUSED" | "CANCELLED";

export interface InitiativeListItem {
  id: string;
  name: string;
  brand_id: number;
  brand_name: string;
  channel_id: number;
  channel_name: string;
  sub_channel_id: number | null;
  sub_channel_name: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  start_date: string | null;
  end_date: string | null;
  budget_amount: number | null;
  currency: string;
  status: InitiativeStatus;
}

export interface InitiativeListResponse {
  items: InitiativeListItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface InitiativeFilters {
  channel_id?: number;
  sub_channel_id?: number;
  brand_id?: number;
  status?: InitiativeStatus;
  search?: string;
  limit?: number;
  offset?: number;
}
