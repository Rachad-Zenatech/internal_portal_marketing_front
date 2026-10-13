// Marketing reference data — mirrors backend models/reference_data_model.py

export interface ReferenceItem {
  id: number;
  code: string;
  name: string;
  sort_order: number;
}

export interface DescribedReferenceItem extends ReferenceItem {
  description: string | null;
}

export interface ChannelItem extends ReferenceItem {
  sub_channel_ids: number[];
}

export interface GoalItem extends ReferenceItem {
  funnel_stage_id: number;
}

export interface ReferenceData {
  brands: ReferenceItem[];
  channels: ChannelItem[];
  sub_channels: ReferenceItem[];
  funnel_stages: ReferenceItem[];
  goals: GoalItem[];
  primary_kpis: ReferenceItem[];
  performance_ratings: DescribedReferenceItem[];
  scale_or_cut_options: DescribedReferenceItem[];
  regions: ReferenceItem[];
  event_types: ReferenceItem[];
}
