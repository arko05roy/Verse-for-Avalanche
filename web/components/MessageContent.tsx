"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface MessageContentProps {
  content: string;
  agentColor?: string;
}

const components: Components = {
  p: ({ children }) => (
    <p className="msg-paragraph">{children}</p>
  ),
  strong: ({ children }) => (
    <strong className="msg-bold">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="msg-italic">{children}</em>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      const lang = className?.replace("language-", "") || "";
      return (
        <div className="msg-codeblock-wrap">
          {lang && <span className="msg-codeblock-lang">{lang}</span>}
          <code className="msg-codeblock">{children}</code>
        </div>
      );
    }
    return <code className="msg-inline-code">{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="msg-pre">{children}</pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="msg-blockquote">{children}</blockquote>
  ),
  ul: ({ children }) => (
    <ul className="msg-ul">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="msg-ol">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="msg-li">{children}</li>
  ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="msg-link">
      {children}
    </a>
  ),
  h1: ({ children }) => <h1 className="msg-heading msg-h1">{children}</h1>,
  h2: ({ children }) => <h2 className="msg-heading msg-h2">{children}</h2>,
  h3: ({ children }) => <h3 className="msg-heading msg-h3">{children}</h3>,
  hr: () => <hr className="msg-hr" />,
  table: ({ children }) => (
    <div className="msg-table-wrap">
      <table className="msg-table">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="msg-th">{children}</th>,
  td: ({ children }) => <td className="msg-td">{children}</td>,
};

export default function MessageContent({ content, agentColor }: MessageContentProps) {
  return (
    <div
      className="msg-content"
      style={{ "--agent-accent": agentColor || "var(--accent-cyan)" } as React.CSSProperties}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
