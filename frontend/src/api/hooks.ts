import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from './client';
import { UserProfile } from '../context/AuthContext';

// Types (matching backend schemas)
export interface MetricResponse {
  total_records: number;
  trusted_identities: number;
  pending_reviews: number;
  data_health: number;
  potential_duplicates: number;
  confirmed_duplicates: number;
  unique_beneficiaries: number;
  records_merged: number;
}

export interface ProgramDuplicateStats {
  program: string;
  uniques: number;
  duplicates: number;
  rate: number;
  color: string;
}

export interface BeneficiaryProgramShare {
  name: string;
  value: number;
  color: string;
}

export interface MatchConfidenceBucket {
  range: string;
  count: number;
}

export interface MergeTimelinePoint {
  date: string;
  merges: number;
  scans: number;
}

export interface OverviewChartsResponse {
  duplicates_by_program: ProgramDuplicateStats[];
  beneficiaries_by_program: BeneficiaryProgramShare[];
  match_confidence: MatchConfidenceBucket[];
  merges_over_time: MergeTimelinePoint[];
}

export interface ProgramMetrics {
  name: string;
  records: number;
  color: string;
  short: string;
}

export interface IdentityItem {
  id: string;
  name: string;
  nid: string;
  programs: string[];
  confidence: number;
  health: number;
  status: string;
}

export interface BeneficiaryProfile {
  id: string;
  name: string;
  national_id: string;
  programs: string[];
  confidence: number;
  health: number;
  status: string;
  phone: string;
  email: string;
  location: string;
}

export interface TimelineEvent {
  date: string;
  time: string;
  event: string;
  type: string;
  detail: string;
}

export interface RecordDetail {
  id: string;
  name: string;
  phone: string;
  email: string;
  national_id: string;
  location: string;
  program: string;
}

export interface ComparisonField {
  key: string;
  label: string;
  score: number;
  status: string;
}

export interface DuplicateCompareResponse {
  record_a: RecordDetail;
  record_b: RecordDetail;
  comparisons: ComparisonField[];
  overall_confidence: number;
}

export interface ResolveDuplicateRequest {
  record_a_id: string;
  record_b_id: string;
  action: 'merge' | 'reject';
  user?: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: UserProfile;
}

export { UserProfile };

export interface AnomalyItem {
  id: string;
  title: string;
  detail: string;
  level: string;
  program: string;
  detected: string;
  records: string[];
  color: string;
}

export interface DimensionDetail {
  label: string;
  value: number;
  color: string;
  issues: number;
  desc: string;
}

export interface QualityDimensionsResponse {
  dimensions: DimensionDetail[];
}

export interface TrendResponse {
  data: number[];
}

export interface FinancialReconciliationSummary {
  total_disbursed: number;
  duplicate_leakage_prevented: number;
  high_risk_payments_flagged: number;
  reconciliation_rate: number;
  at_risk_records_count: number;
}

// Query Keys
export const queryKeys = {
  overview: {
    metrics: ['overview', 'metrics'] as const,
    charts: ['overview', 'charts'] as const,
    programs: ['overview', 'programs'] as const,
  },
  identities: {
    list: (status?: string, search?: string) => ['identities', status, search] as const,
    profile: (id: string) => ['identities', 'profile', id] as const,
    timeline: (id: string) => ['identities', 'timeline', id] as const,
  },
  duplicates: {
    compare: (a: string, b: string) => ['duplicates', 'compare', a, b] as const,
  },
  anomalies: {
    list: ['anomalies'] as const,
  },
  quality: {
    dimensions: ['quality', 'dimensions'] as const,
    trend: ['quality', 'trend'] as const,
  },
  financial: {
    reconciliation: ['financial', 'reconciliation'] as const,
    leakageTrend: ['financial', 'leakage-trend'] as const,
    highRiskPayments: ['financial', 'high-risk-payments'] as const,
    settings: ['financial', 'reconciliation', 'settings'] as const,
  },
  governance: {
    anonymise: ['governance', 'anonymise'] as const,
  },
  audit: {
    list: ['audit'] as const,
  },
  notifications: {
    dispatch: ['notifications', 'dispatch'] as const,
  },
} as const;

// Overview hooks
export function useOverviewMetrics() {
  return useQuery({
    queryKey: queryKeys.overview.metrics,
    queryFn: async () => {
      const res = await api.get<MetricResponse>('/api/v1/overview/metrics');
      return res.data;
    },
    staleTime: 30000,
  });
}

export function useOverviewCharts() {
  return useQuery({
    queryKey: queryKeys.overview.charts,
    queryFn: async () => {
      const res = await api.get<OverviewChartsResponse>('/api/v1/overview/charts');
      return res.data;
    },
    staleTime: 30000,
  });
}

export function useProgramMetrics() {
  return useQuery({
    queryKey: queryKeys.overview.programs,
    queryFn: async () => {
      const res = await api.get<ProgramMetrics[]>('/api/v1/overview/programs');
      return res.data;
    },
    staleTime: 60000,
  });
}

// Identities hooks
export function useIdentities(status?: string, search?: string) {
  return useQuery({
    queryKey: queryKeys.identities.list(status, search),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status && status !== 'all') params.append('status', status);
      if (search) params.append('search', search);
      const res = await api.get<IdentityItem[]>(`/api/v1/identities?${params.toString()}`);
      return res.data;
    },
    staleTime: 15000,
  });
}

export function useBeneficiaryProfile(id: string) {
  return useQuery({
    queryKey: queryKeys.identities.profile(id),
    queryFn: async () => {
      const res = await api.get<BeneficiaryProfile>(`/api/v1/beneficiaries/${id}`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

export function useBeneficiaryTimeline(id: string) {
  return useQuery({
    queryKey: queryKeys.identities.timeline(id),
    queryFn: async () => {
      const res = await api.get<TimelineEvent[]>(`/api/v1/beneficiaries/${id}/timeline`);
      return res.data;
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

// Duplicates hooks
export function useCompareRecords(recordA: string, recordB: string) {
  return useQuery({
    queryKey: queryKeys.duplicates.compare(recordA, recordB),
    queryFn: async () => {
      const res = await api.get<DuplicateCompareResponse>(
        `/api/v1/duplicates/compare?record_a=${encodeURIComponent(recordA)}&record_b=${encodeURIComponent(recordB)}`
      );
      return res.data;
    },
    enabled: !!recordA && !!recordB && recordA !== recordB,
    staleTime: 10000,
  });
}

export function useResolveDuplicate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (req: ResolveDuplicateRequest) => {
      const res = await api.post('/api/v1/duplicates/resolve', req);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['identities'] });
      queryClient.invalidateQueries({ queryKey: ['overview'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

// Anomalies hook
export function useAnomalies() {
  return useQuery({
    queryKey: queryKeys.anomalies.list,
    queryFn: async () => {
      const res = await api.get<AnomalyItem[]>('/api/v1/anomalies');
      return res.data;
    },
    staleTime: 30000,
  });
}

// Quality hooks
export function useQualityDimensions() {
  return useQuery({
    queryKey: queryKeys.quality.dimensions,
    queryFn: async () => {
      const res = await api.get<QualityDimensionsResponse>('/api/v1/quality/dimensions');
      return res.data;
    },
    staleTime: 60000,
  });
}

export function useQualityTrend() {
  return useQuery({
    queryKey: queryKeys.quality.trend,
    queryFn: async () => {
      const res = await api.get<TrendResponse>('/api/v1/quality/trend');
      return res.data;
    },
    staleTime: 60000,
  });
}

export function useFinancialReconciliation() {
  return useQuery({
    queryKey: queryKeys.financial.reconciliation,
    queryFn: async () => {
      const res = await api.get<FinancialReconciliationSummary>('/api/v1/financial/reconciliation');
      return res.data;
    },
    staleTime: 60000,
  });
}

export function useFinancialLeakageTrend() {
  return useQuery({
    queryKey: queryKeys.financial.leakageTrend,
    queryFn: async () => {
      const res = await api.get<LeakageTrendItem[]>('/api/v1/financial/leakage-trend');
      return res.data;
    },
    staleTime: 60000,
  });
}

export function useHighRiskPayments() {
  return useQuery({
    queryKey: queryKeys.financial.highRiskPayments,
    queryFn: async () => {
      const res = await api.get<HighRiskPaymentItem[]>('/api/v1/financial/high-risk-payments');
      return res.data;
    },
    staleTime: 60000,
  });
}

export function useReconciliationSettings() {
  return useQuery({
    queryKey: queryKeys.financial.settings,
    queryFn: async () => {
      const res = await api.get<ReconciliationSettingsResponse>('/api/v1/financial/reconciliation/settings');
      return res.data;
    },
    staleTime: 60000,
  });
}

export function useUpdateReconciliationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: ReconciliationSettingsRequest) => {
      const res = await api.post('/api/v1/financial/reconciliation/settings', req);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.settings });
      queryClient.invalidateQueries({ queryKey: queryKeys.financial.reconciliation });
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.list });
    },
  });
}

export interface LeakageTrendItem {
  month: string;
  amount: number;
}

export interface HighRiskPaymentItem {
  id: string;
  beneficiary_id: string;
  name: string;
  program: string;
  code: string;
  reason: string;
  amount: number;
  status: string;
}

export interface ReconciliationSettingsRequest {
  mismatch_threshold: number;
  holding_on_mismatch: boolean;
}

export interface ReconciliationSettingsResponse {
  mismatch_threshold: number;
  holding_on_mismatch: boolean;
}

export interface GovernanceToggleResponse {
  masking_enabled: boolean;
  status: string;
}

export function useToggleKdpaAnonymisation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.post<GovernanceToggleResponse>('/api/v1/governance/anonymise');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.identities.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.list });
    },
  });
}

export function useAuditTrail() {
  return useQuery({
    queryKey: queryKeys.audit.list,
    queryFn: async () => {
      const res = await api.get<Record<string, any[]>>('/api/v1/audit');
      return res.data;
    },
    staleTime: 15000,
  });
}

export interface NotificationRequest {
  channel: 'sms' | 'whatsapp';
  recipient: string;
  message: string;
  reference_id?: string;
}

export interface NotificationResponse {
  status: string;
  channel: string;
  recipient: string;
  reference_id?: string;
}

export function useDispatchNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (req: NotificationRequest) => {
      const res = await api.post<NotificationResponse>('/api/v1/notifications/dispatch', req);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.audit.list });
    },
  });
}