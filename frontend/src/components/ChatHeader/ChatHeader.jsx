import { ChevronDown, Menu, LogOut } from "lucide-react";
import styles from "./ChatHeader.module.css";

export default function ChatHeader({ onMenuClick, user, onLogout }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuClick} aria-label="Open menu">
          <Menu size={22} />
        </button>
        <span>ChatGPT</span>
        <ChevronDown size={16} />
      </div>
      <div className={styles.right}>
        {user && (
          <span className={styles.userName} title={user.email}>
            {user.name}
          </span>
        )}
        <button className={styles.logoutBtn} onClick={onLogout} title="Sign out">
          <LogOut size={18} />
        </button>
        <div className={styles.avatar}>
          {(user?.name || "U").slice(0, 2).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
