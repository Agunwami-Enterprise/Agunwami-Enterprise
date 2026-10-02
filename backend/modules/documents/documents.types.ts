/**
 * backend/modules/documents/documents.types.ts
 *
 * Types for CEO Documents & Corporate Records.
 */

export type DocumentCategory =
  | 'Policies'
  | 'Executive'
  | 'Legal & Contracts'
  | 'Financial Reports'
  | 'Operations'
  | 'HR';

export interface CorporateDocument {
  id: string;
  title: string;
  category: DocumentCategory;
  fileUrl?: string;
  fileType: string;
  fileSize: string;
  uploadedBy: string;
  uploadedByName?: string;
  isConfidential: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DocumentFilter {
  category?: DocumentCategory;
  search?: string;
  limit?: number;
}

export interface CreateDocumentDto {
  title: string;
  category: DocumentCategory;
  fileUrl: string;
  fileType: string;
  fileSize: string;
  isConfidential?: boolean;
}
