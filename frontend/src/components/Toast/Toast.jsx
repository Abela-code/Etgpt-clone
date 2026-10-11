import { useEffect } from "react";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";
import styles from "./Toast.module.css";

export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, toast.duration ?? 4500);
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const Icon =
    toast.type === "success"
      ? CheckCircle
      : toast.type === "info"
        ? Info
        : AlertCircle;

  return (
    <div className={`${styles.toast} ${styles[toast.type || "error"]}`} role="alert">
      <Icon size={18} className={styles.icon} />
      <span className={styles.message}>{toast.message}</span>
      <button className={styles.close} onClick={onClose} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
