import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-neutral max-w-none break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold mt-8 mb-3 border-b pb-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mt-6 mb-2">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="leading-relaxed my-3">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-6 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-6 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed">{children}</li>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 border rounded-lg">
              <table className="min-w-full text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border px-3 py-2 bg-muted font-medium text-left">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border px-3 py-2 align-top">
              {children}
            </td>
          ),
          code({ className, children }) {
            const isBlock = !!className; // ```lang gives className like "language-sql"
          
            if (!isBlock) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-muted text-sm">
                  {children}
                </code>
              );
            }
          
            return (
              <pre className="bg-black text-white p-4 rounded-lg overflow-x-auto text-sm">
                <code className={className}>{children}</code>
              </pre>
            );
          },
          
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
