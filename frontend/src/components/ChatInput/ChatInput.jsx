import { useState, useRef } from "react";
import { Plus, Mic, ArrowUp, Square, X, Image as ImageIcon } from "lucide-react";
import styles from "./ChatInput.module.css";

export default function ChatInput({ handleSendMessage, isLoading, onStop }) {
  const [input, setInput] = useState("");
  const [attachment, setAttachment] = useState(null); // { name, type, dataUrl }
  const fileRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((!input.trim() && !attachment) || isLoading) return;
    handleSendMessage(input.trim() || "Describe this image", attachment);
    setInput("");
    setAttachment(null);
  };

  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Only image files are supported for now.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      alert("Image must be under 4MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        name: file.name,
        type: file.type,
        dataUrl: reader.result,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={styles.container}>
      {attachment && (
        <div className={styles.preview}>
          <img src={attachment.dataUrl} alt={attachment.name} />
          <span className={styles.previewName}>{attachment.name}</span>
          <button
            type="button"
            className={styles.removeAttach}
            onClick={() => setAttachment(null)}
            aria-label="Remove attachment"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className={styles.hiddenFile}
          onChange={onFileChange}
        />
        <button
          type="button"
          className={styles.iconBtn}
          title="Upload image"
          onClick={() => fileRef.current?.click()}
          disabled={isLoading}
        >
          <Plus size={20} />
        </button>
        <input
          type="text"
          className={styles.input}
          placeholder={attachment ? "Ask about this image…" : "Ask anything"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        {isLoading ? (
          <button
            type="button"
            className={styles.stopBtn}
            onClick={onStop}
            title="Stop generating"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : input.trim() || attachment ? (
          <button type="submit" className={styles.submitBtn}>
            <ArrowUp size={18} />
          </button>
        ) : (
          <div className={styles.icon}>
            <Mic size={20} />
          </div>
        )}
      </form>
    </div>
  );
}
