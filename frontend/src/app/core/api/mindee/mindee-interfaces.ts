/**
 * Mindee API Types and Interfaces
 * Based on official Mindee V2 API documentation: https://docs.mindee.com/integrations/api-reference
 */

// V2 API Job Response Structure (from enqueue endpoint)
export interface MindeeJobResponse {
  job: {
    id: string;
    model_id: string;
    filename: string;
    alias?: string;
    created_at: string;
    status: 'Processing' | 'Processed' | 'Failed';
    polling_url: string;
    result_url?: string;
    webhooks: MindeeWebhook[];
    error?: MindeeApiError;
  };
}

// V2 API Inference Response Structure (from result endpoint)
export interface MindeeApiResponse<T = any> {
  inference: MindeeInferenceResult<T>;
}

// Individual inference object (returned directly from polling when complete)
export interface MindeeInferenceResult<T = any> {
  id: string;
  model: {
    id: string;
  };
  file: {
    name: string;
    alias?: string;
    page_count: number;
    mime_type: string;
  };
  result: {
    fields: T;
    raw_text?: {
      pages: Array<{
        content: string;
      }>;
    };
  };
  active_options: {
    raw_text?: boolean;
    polygon?: boolean;
    confidence?: boolean;
    rag?: boolean;
  };
}

export interface MindeeWebhook {
  id: string;
  created_at: string;
  status: 'Processing' | 'Processed' | 'Failed';
  error?: MindeeApiError;
}

export interface MindeeApiError {
  status: number;
  detail: string;
}

export interface MindeeDocument<T = any> {
  id: string;
  inference: {
    extras: Record<string, any>;
    finished_at: string;
    is_rotation_applied: boolean;
    pages: MindeePagePrediction<T>[];
    prediction: T;
    processing_time: number;
    product: {
      features: string[];
      name: string;
      type: string;
      version: string;
    };
    started_at: string;
  };
  n_pages: number;
  name: string;
}

export interface MindeePagePrediction<T = any> {
  extras: Record<string, any>;
  id: number;
  orientation: {
    value: number;
  };
  prediction: T;
}

// Expense Receipt Specific Interfaces (V2 API)
export interface ExpenseReceiptPrediction {
  supplier_name: MindeeField<string>;
  supplier_address: MindeeField<string>;
  supplier_phone_number: MindeeField<string>;
  supplier_company_registration: MindeeField<any>;
  receipt_number: MindeeField<string>;
  date: MindeeField<string>;
  time: MindeeField<string>;
  total_amount: MindeeField<number>;
  total_net: MindeeField<number>;
  total_tax: MindeeField<number>;
  taxes: MindeeField<{
    rate: number;
    base: number;
    amount: number;
  }>;
  tips_gratuity: MindeeField<number>;
  line_items: MindeeField<{
    description: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
  document_type: MindeeField<string>;
  purchase_category: MindeeField<string>;
  purchase_subcategory: MindeeField<string>;
  locale: MindeeField<{
    language: string;
    country: string;
    currency: string;
  }>;
}

export interface MindeeField<T = any> {
  locations: {
    polygon: number[][];
    page: number;
  }[];
  confidence: number | null;
  value: T;
}

// Invoice Specific Interfaces
export interface InvoicePrediction {
  billing_address: MindeeField<string>;
  customer_address: MindeeField<string>;
  customer_company_registrations: MindeeField<{
    type: string;
    value: string;
  }>[];
  customer_name: MindeeField<string>;
  date: MindeeField<string>;
  document_type: MindeeField<string>;
  due_date: MindeeField<string>;
  invoice_number: MindeeField<string>;
  line_items: MindeeField<{
    description: string;
    product_code: string;
    quantity: number;
    tax_amount: number;
    tax_rate: number;
    total_amount: number;
    unit_price: number;
  }>[];
  locale: MindeeField<{
    country: string;
    currency: string;
    language: string;
  }>;
  reference_numbers: MindeeField<string>[];
  shipping_address: MindeeField<string>;
  supplier_address: MindeeField<string>;
  supplier_company_registrations: MindeeField<{
    type: string;
    value: string;
  }>[];
  supplier_name: MindeeField<string>;
  supplier_payment_details: MindeeField<{
    account_number: string;
    iban: string;
    routing_number: string;
    swift: string;
  }>[];
  taxes: MindeeField<{
    rate: number;
    value: number;
  }>[];
  total_amount: MindeeField<number>;
  total_net: MindeeField<number>;
  total_tax: MindeeField<number>;
}

// V2 API Request Options
export interface MindeeRequestOptions {
  raw_text?: boolean;      // Extract the entire text from the document
  polygon?: boolean;       // Calculate bounding box polygons for values
  confidence?: boolean;    // Calculate confidence scores for values
  rag?: boolean;          // Use Retrieval-Augmented Generation during inference
  alias?: string;         // Use an alias to link the file to your own DB
  webhook_ids?: string[]; // Webhook IDs to call after processing is finished
}

// Supported Document Types
export type MindeeProductType = 
  | 'mindee/expense_receipts'
  | 'mindee/invoices'
  | 'mindee/financial_document'
  | 'mindee/passport'
  | 'mindee/bank_check'
  | 'mindee/resume'
  | 'mindee/proof_of_address'
  | 'mindee/international_id'
  | 'mindee/us_driver_license'
  | 'mindee/us_w9'
  | 'mindee/us_bank_check'
  | 'mindee/fr_id_card'
  | 'mindee/fr_carte_vitale'
  | 'mindee/fr_carte_grise'
  | 'mindee/eu_license_plate'
  | 'mindee/multi_receipts_detector';

// API Versions
export interface MindeeApiVersion {
  v1?: string;
  v2?: string;
  v3?: string;
  v4?: string;
}

export const MINDEE_API_VERSIONS: Record<MindeeProductType, MindeeApiVersion> = {
  'mindee/expense_receipts': { v2: 'v2', v4: 'v4' },
  'mindee/invoices': { v4: 'v4' },
  'mindee/financial_document': { v1: 'v1' },
  'mindee/passport': { v1: 'v1' },
  'mindee/bank_check': { v1: 'v1' },
  'mindee/resume': { v1: 'v1' },
  'mindee/proof_of_address': { v1: 'v1' },
  'mindee/international_id': { v2: 'v2' },
  'mindee/us_driver_license': { v1: 'v1' },
  'mindee/us_w9': { v1: 'v1' },
  'mindee/us_bank_check': { v1: 'v1' },
  'mindee/fr_id_card': { v2: 'v2' },
  'mindee/fr_carte_vitale': { v1: 'v1' },
  'mindee/fr_carte_grise': { v1: 'v1' },
  'mindee/eu_license_plate': { v1: 'v1' },
  'mindee/multi_receipts_detector': { v1: 'v1' }
};

// Error Types
export interface MindeeErrorResponse {
  api_request: {
    error: MindeeApiError;
    resources: string[];
    status: 'failure';
    status_code: number;
    url: string;
  };
}

// HTTP Status Codes used by Mindee
export enum MindeeHttpStatus {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503
}