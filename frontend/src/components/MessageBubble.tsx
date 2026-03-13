import ReactMarkdown from 'react-markdown';
import type { Source } from '../types';

interface Props {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export default function MessageBubble({ role, content, sources }: Props) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md'
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {sources && sources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-gray-300">
            <p className="text-xs font-semibold text-gray-500 mb-1">Sources:</p>
            {sources.map((src, i) => (
              <p key={i} className="text-xs text-gray-500">
                📄 {src.filename} (chunk {src.chunk_index})
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
