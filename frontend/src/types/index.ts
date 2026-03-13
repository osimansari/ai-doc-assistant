export interface DocumentInfo {
  id: string;
  filename: string;
  file_type: string;
  chunk_count: number;
  uploaded_at: string;
}

export interface UploadResponse {
  document_id: string;
  filename: string;
  chunk_count: number;
  message: string;
}

export interface Source {
  filename: string;
  chunk_index: number;
  preview: string;
}

export interface QueryResponse {
  answer: string;
  sources: Source[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  timestamp: Date;
}
