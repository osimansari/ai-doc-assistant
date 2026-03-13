import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage, DocumentInfo } from './types';
import { uploadDocument, queryAssistant, listDocuments, deleteDocument } from './api/client';
import ChatWindow from './components/ChatWindow';
import UploadPanel from './components/UploadPanel';
import DocumentList from './components/DocumentList';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshDocuments = useCallback(async () => {
    try {
      const docs = await listDocuments();
      setDocuments(docs);
    } catch {
      // Silently fail — documents list is not critical
    }
  }, []);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await uploadDocument(file);
      await refreshDocuments();

      // Add a system-like message confirming the upload
      const msg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `✅ **${result.filename}** uploaded successfully — split into **${result.chunk_count} chunks**. You can now ask questions about it!`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, msg]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Upload failed. Please try again.';
      setError(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      await refreshDocuments();
    } catch {
      setError('Failed to delete document.');
    }
  };

  const handleSend = async (question: string) => {
    // Add user message
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const result = await queryAssistant(question);
      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: result.answer,
        sources: result.sources,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to get a response.';
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `❌ Error: ${message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-gray-800">🧠 AI Doc Assistant</h1>
          <p className="text-xs text-gray-400 mt-0.5">RAG-powered document Q&A</p>
        </div>

        <UploadPanel onUpload={handleUpload} isUploading={isUploading} />

        <div className="flex-1 overflow-y-auto border-t border-gray-200">
          <DocumentList documents={documents} onDelete={handleDelete} />
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex-1 flex flex-col">
        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700 flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        )}
        <ChatWindow
          messages={messages}
          onSend={handleSend}
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
