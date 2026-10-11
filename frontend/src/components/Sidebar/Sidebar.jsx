import { useState } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeftClose,
} from "lucide-react";
import styles from "./Sidebar.module.css";

export default function Sidebar({
  chats,
  activeChatId,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  user,
  onLogout,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  const startEdit = (e, chat) => {
    e.stopPropagation();
    setEditingId(chat.id);
    setEditTitle(chat.title || "New chat");
  };

  const saveEdit = (e) => {
    e?.stopPropagation();
    if (editingId && editTitle.trim()) {
      onRenameChat(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEdit = (e) => {
    e?.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (window.confirm("Delete this chat?")) {
      onDeleteChat(id);
    }
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.iconBtn}>
            <PanelLeftClose size={20} />
          </div>
          <span className={styles.brand}>EtGPT</span>
        </div>
        <button className={styles.newChatBtn} onClick={onNewChat} title="New chat">
          <Plus size={18} />
          <span>New chat</span>
        </button>
      </div>

      <div className={styles.sectionLabel}>Chats</div>

      <nav className={styles.nav}>
        {chats.length === 0 && (
          <p className={styles.empty}>No chats yet</p>
        )}
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`${styles.chatItem} ${
              activeChatId === chat.id ? styles.active : ""
            }`}
            onClick={() => onSelectChat(chat.id)}
          >
            <MessageSquare size={16} className={styles.chatIcon} />

            {editingId === chat.id ? (
              <div className={styles.editRow} onClick={(e) => e.stopPropagation()}>
                <input
                  className={styles.editInput}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit(e);
                    if (e.key === "Escape") cancelEdit(e);
                  }}
                  autoFocus
                />
                <button className={styles.iconBtn} onClick={saveEdit} title="Save">
                  <Check size={14} />
                </button>
                <button className={styles.iconBtn} onClick={cancelEdit} title="Cancel">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <span className={styles.chatTitle}>{chat.title || "New chat"}</span>
                <div className={styles.actions}>
                  <button
                    className={styles.iconBtn}
                    onClick={(e) => startEdit(e, chat)}
                    title="Rename"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={(e) => handleDelete(e, chat.id)}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </nav>

      {user && (
        <div className={styles.footer}>
          <div className={styles.footerUser}>
            <div className={styles.footerAvatar}>
              {(user.name || "U").slice(0, 1).toUpperCase()}
            </div>
            <div className={styles.footerMeta}>
              <span className={styles.footerName}>{user.name}</span>
              <span className={styles.footerEmail}>{user.email}</span>
            </div>
          </div>
          <button className={styles.footerLogout} onClick={onLogout}>
            Sign out
          </button>
        </div>
      )}
    </aside>
  );
}
