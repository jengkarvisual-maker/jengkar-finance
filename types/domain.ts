export type MetricTrend = {
  label: string;
  value: number;
  previousValue?: number;
};

export type DashboardMetric = {
  label: string;
  value: number;
  previousValue?: number;
  hint?: string;
};

export type ChartPoint = {
  label: string;
  value: number;
  secondaryValue?: number;
};

export type BrandOption = {
  id: string;
  name: string;
  slug: string;
  code: string;
  color?: string | null;
};

export type ReportFilter = {
  brandId?: string;
  projectId?: string;
  accountCategory?: string;
  from?: string;
  to?: string;
  month?: string;
  year?: string;
  query?: string;
  status?: string;
  page?: number;
};
