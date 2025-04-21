// User types
export type User = {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
  created_at: string;
};

export type UserCredentials = {
  email: string;
  password: string;
};

export type UserRegister = {
  name: string;
  email: string;
  password: string;
  is_admin?: boolean;
};

// Inquiry types
export enum InquiryType {
  TECHNICAL = "technical",
  BILLING = "billing",
  GENERAL = "general",
  FEATURE_REQUEST = "feature_request",
  COMPLAINT = "complaint",
  OTHER = "other"
}

export enum InquiryStatus {
  NEW = "new",
  IN_PROGRESS = "in_progress",
  AWAITING_CUSTOMER = "awaiting_customer",
  ESCALATED = "escalated",
  RESOLVED = "resolved",
  CLOSED = "closed"
}

export type Inquiry = {
  id: number;
  subject: string;
  content: string;
  customer_id: number | null;
  inquiry_type: InquiryType;
  confidence_score: number;
  status: InquiryStatus;
  escalated: boolean;
  escalation_reason: string | null;
  created_at: string;
};

export type InquiryCreate = {
  subject: string;
  content: string;
  customer_id?: number;
};

export type InquiryUpdate = {
  status?: InquiryStatus;
  escalated?: boolean;
};

// Response types
export type Response = {
  id: number;
  content: string;
  inquiry_id: number;
  agent_id: number | null;
  is_automated: boolean;
  created_at: string;
};

export type ResponseCreate = {
  content: string;
  inquiry_id: number;
  agent_id?: number;
  is_automated: boolean;
};

// FollowUp types
export type FollowUp = {
  id: number;
  inquiry_id: number;
  content: string;
  scheduled_at: string;
  sent_at: string | null;
  successful: boolean | null;
};

// Notification types
export type NotificationType = 'NEW_INQUIRY' | 'ESCALATION' | 'NEW_RESPONSE' | 'STATUS_CHANGE';

export type Notification = {
  id: string;
  type: NotificationType;
  message: string;
  entityId: number;
  entityType: 'inquiry' | 'response';
  timestamp: string;
  read: boolean;
};

// API response types
export type ApiResponse<T> = {
  data: T;
  error?: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
};