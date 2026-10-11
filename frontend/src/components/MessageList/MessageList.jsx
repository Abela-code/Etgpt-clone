import { Bot } from "lucide-react";
import ChatMessage from "../ChatMessage/ChatMessage";
import styles from "./MessageList.module.css";

const SUGGESTIONS = [
  "Explain quantum computing simply",
  "Write a Python function to reverse a string",
  "Ideas for a weekend project",
  "Summarize the benefits of exercise",
];

function Skeleton() {
  return (
    <div className={styles.skeletonWrap}>
      {[1, 2, 3].map((i) => (
        <div key={i} className={styles.skeletonRow}>
          <div className={styles.skeletonAvatar} />
          <div className={styles.skeletonLines}>
            <div className={styles.skeletonLine} style={{ width: "90%" }} />
            <div className={styles.skeletonLine} style={{ width: "70%" }} />
            <div className={styles.skeletonLine} style={{ width: "40%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MessageList({
  conversations,
  isLoading,
  historyLoading,
  streamingContent,
  messagesEndRef,
  onSuggestionClick,
}) {
  const showStream = isLoading && streamingContent;

  if (historyLoading) {
    return (
      <div className={styles.messages}>
        <Skeleton />
      </div>
    );
  }

  return (
    <div className={styles.messages}>
      {conversations.length === 0 && !isLoading ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>What are you working on?</h2>
          <p className={styles.emptySub}>
            Ask anything — code, ideas, explanations, or writing help.
          </p>
          <div className={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className={styles.suggestion}
                onClick={() => onSuggestionClick?.(s)}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        conversations.map((msg) => (
          <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
        ))
      )}

      {showStream && (
        <ChatMessage role="assistant" content={streamingContent} />
      )}

      {isLoading && !streamingContent && (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingAvatar}>
            <Bot size={18} color="white" />
          </div>
          <div className={styles.loading}>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
            <div className={styles.loadingDot}></div>
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}
