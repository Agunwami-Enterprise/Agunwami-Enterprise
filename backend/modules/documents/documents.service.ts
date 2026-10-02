/**
 * backend/modules/documents/documents.service.ts
 *
 * Server-side Documents Management Service.
 * Manages executive corporate documents and files strictly from AEHub Firestore
 * documents collection with ZERO dummy fallbacks.
 */

import { listDocs, getDoc, createDoc, deleteDoc } from '../../core/firestore';
import type {
  CorporateDocument,
  DocumentCategory,
  DocumentFilter,
  CreateDocumentDto,
} from './documents.types';

export class DocumentsService {
  /**
   * Lists corporate documents from Firestore. Returns empty list if collection has no docs.
   */
  static async getDocuments(filter: DocumentFilter = {}): Promise<CorporateDocument[]> {
    const docs = await listDocs('documents', filter.limit || 50).catch(() => []);

    let items: CorporateDocument[] = docs.map(d => ({
      id: d._id,
      title: d.title || d.name || 'Untitled Document',
      category: (d.category || 'Executive') as DocumentCategory,
      fileUrl: d.fileUrl || d.url || '',
      fileType: d.fileType || d.type || 'PDF',
      fileSize: d.fileSize || d.size || '0 KB',
      uploadedBy: d.uploadedBy || '',
      uploadedByName: d.uploadedByName || '',
      isConfidential: Boolean(d.isConfidential),
      createdAt: d.createdAt || d._createTime || '',
      updatedAt: d.updatedAt || d._updateTime,
    }));

    if (filter.category) {
      items = items.filter(d => d.category.toLowerCase() === filter.category!.toLowerCase());
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      items = items.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.uploadedByName?.toLowerCase().includes(q)
      );
    }

    return items;
  }

  /**
   * Registers a new corporate document in Firestore.
   */
  static async createDocument(
    dto: CreateDocumentDto,
    uploadedBy = 'that.dev.guy.aeceo@aehub.io'
  ): Promise<CorporateDocument | null> {
    const data = {
      title: dto.title,
      category: dto.category,
      fileUrl: dto.fileUrl,
      fileType: dto.fileType,
      fileSize: dto.fileSize,
      isConfidential: Boolean(dto.isConfidential),
      uploadedBy,
      uploadedByName: 'Agunwami CEO',
      createdAt: new Date().toISOString(),
    };

    const created = await createDoc('documents', data);
    if (!created) return null;

    return {
      id: created._id,
      ...data,
    };
  }

  /**
   * Deletes a document record.
   */
  static async deleteDocument(id: string): Promise<boolean> {
    return await deleteDoc('documents', id);
  }
}
