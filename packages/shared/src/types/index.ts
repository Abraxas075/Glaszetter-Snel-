// Common types for Glaszetter Snel

// Authentication & Users
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole =
  | 'owner'
  | 'planner'
  | 'inmeter'
  | 'glaszetter'
  | 'warehouse'
  | 'admin'
  | 'external';

export interface AuthSession {
  userId: string;
  token: string;
  expiresAt: Date;
}

// Company
export interface Company {
  id: string;
  name: string;
  taxId?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  iban?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Customer
export interface Customer {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  taxId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Project
export interface Project {
  id: string;
  companyId: string;
  customerId: string;
  name: string;
  address?: string;
  city?: string;
  description?: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectStatus = 'concept' | 'active' | 'completed' | 'archived';

// Job/Klus
export interface Job {
  id: string;
  projectId: string;
  companyId: string;
  name: string;
  status: JobStatus;
  dueDate?: Date;
  teamId?: string;
  scheduledDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type JobStatus =
  | 'concept'
  | 'measuring'
  | 'quote'
  | 'approved'
  | 'ordered'
  | 'delivery_expected'
  | 'scheduled'
  | 'in_progress'
  | 'completion'
  | 'completed'
  | 'invoiced';

// Element
export interface Element {
  id: string;
  jobId: string;
  projectId: string;
  code: string;
  type: ElementType;
  location?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ElementType =
  | 'fixed_window'
  | 'casement'
  | 'tilt_turn'
  | 'door'
  | 'sliding'
  | 'transom'
  | 'sidelight'
  | 'glass_wall'
  | 'skylight'
  | 'bay_window'
  | 'other';

// Measurement
export interface Measurement {
  id: string;
  elementId: string;
  jobId: string;
  width: number;
  height: number;
  glassType?: string;
  notes?: string;
  photos?: string[];
  voiceMemos?: string[];
  status: MeasurementStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type MeasurementStatus =
  | 'draft'
  | 'submitted'
  | 'reviewed'
  | 'approved';

// Photo
export interface Photo {
  id: string;
  companyId: string;
  jobId?: string;
  elementId?: string;
  url: string;
  originalFilename?: string;
  contentType?: string;
  sizeBytes?: number;
  caption?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Team
export interface Team {
  id: string;
  companyId: string;
  name: string;
  color?: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Quote/Offerte
export type QuoteStatus = 'concept' | 'sent' | 'approved' | 'rejected' | 'expired';

export interface QuoteLine {
  id: string;
  quoteId: string;
  elementId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Quote {
  id: string;
  companyId: string;
  jobId: string;
  projectId: string;
  quoteNumber: string;
  status: QuoteStatus;
  vatRate: number;
  validUntil?: Date;
  notes?: string;
  lines: QuoteLine[];
  subtotal: number;
  vatAmount: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

// Invoice/Factuur
export type InvoiceStatus = 'concept' | 'sent' | 'paid' | 'overdue';

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  elementId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Invoice {
  id: string;
  companyId: string;
  jobId: string;
  projectId: string;
  quoteId?: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  vatRate: number;
  dueDate?: Date;
  notes?: string;
  lines: InvoiceLine[];
  subtotal: number;
  vatAmount: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
}

// API Response
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
