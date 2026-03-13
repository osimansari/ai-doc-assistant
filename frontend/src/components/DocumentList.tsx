import type { DocumentInfo } from '../types';

interface Props {
  documents: DocumentInfo[];
  onDelete: (id: string) => void;
}

export default function DocumentList({ documents, onDelete }: Props) {
  return (
    <div className="p-4">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
        Documents ({documents.length})
      </h2>

      {documents.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No documents uploaded yet
        </p>
      ) : (
        <ul className="space-y-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="bg-white rounded-lg p-3 border border-gray-200 group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {doc.chunk_count} chunks · {doc.file_type}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(doc.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete document"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
