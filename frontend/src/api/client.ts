import axios from 'axios';
import type { DocumentInfo, QueryResponse, UploadResponse } from '../types';

const api = axios.create({ baseURL: '/api' });

export async function uploadDocument(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<UploadResponse>('/upload', formData);
  return data;
}

export async function queryAssistant(question: string): Promise<QueryResponse> {
  const { data } = await api.post<QueryResponse>('/query', { question });
  return data;
}

export async function listDocuments(): Promise<DocumentInfo[]> {
  const { data } = await api.get<DocumentInfo[]>('/documents');
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/documents/${id}`);
}
