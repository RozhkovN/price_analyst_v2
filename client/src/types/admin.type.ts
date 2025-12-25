export interface FileContent {
  [key: string]: any;
}

export interface AdminUserRequest {
  fullName: string;
  inn: string;
  phone: string;
  fileContent?: FileContent[];
  timestamp: string;
}

export interface CompanyGroup {
  fullName: string;
  inn: string;
  phone: string;
  requests: AdminUserRequest[];
}

export interface UploadResponse {
  success: boolean;
  message: string;
  newRecords: number;
  updatedRecords: number;
  unchangedRecords: number;
  processedRecords: number;
  failedRecords: number;
}
