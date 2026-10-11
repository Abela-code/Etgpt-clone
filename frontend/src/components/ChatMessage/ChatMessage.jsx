import { useState } from "react";
import { User, Bot, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import styles from "./ChatMessage.module.css";

function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false);
  const code = String(children).replace(/\n$/, "");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      /* ignore */
    }
  };

  return (
    <div className={styles.codeBlock}>
      <div className={styles.codeHeader}>
        <span className={styles.codeLang}>{language || "code"}</span>
        <button className={styles.copyBtn} onClick={handleCopy} type="button">
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <SyntaxHighlighter
        style={oneDark}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0 0 8px 8px",
          background: "#0d0d0d",
          fontSize: "13px",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default function ChatMessage({ role, content }) {
  const normalizedRole = String(role || "").toLowerCase();
  const isUser = normalizedRole === "user";

  return (
    <div
      className={`${styles.message} ${styles[isUser ? "user" : "assistant"]}`}
    >
      <div
        className={`${styles.avatar} ${styles[isUser ? "user" : "assistant"]}`}
      >
        {isUser ? (
          <User size={18} color="white" />
        ) : (
          <Bot size={18} color="white" />
        )}
      </div>
      <div className={styles.content}>
        {isUser ? (
          content
        ) : (
          <div className={styles.markdownBody}>
            <ReactMarkdown
              components={{
                code({ inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || "");
                  if (!inline && (match || String(children).includes("\n"))) {
                    return (
                      <CodeBlock language={match?.[1]}>
                        {children}
                      </CodeBlock>
                    );
                  }
                  return (
                    <code className={styles.inlineCode} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
