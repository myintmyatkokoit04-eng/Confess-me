import React from "react";
import { Feather, LibraryBig, MessagesSquare, NotebookPen } from "lucide-react";

const icons = {
  journal: NotebookPen,
  messages: MessagesSquare,
  saved: LibraryBig,
  write: Feather,
};

export default function NavigationIcon({ kind, size = 24 }) {
  if (kind === "home") {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.65" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true" className="navigation-icon">
        <path d="M3.5 10.5 12 3.75l8.5 6.75M5.5 9v9.5A1.5 1.5 0 0 0 7 20h10a1.5 1.5 0 0 0 1.5-1.5V9" />
        <path d="M12 17.75V14m0 1c0-2.4 1.2-3.75 3.6-3.75 0 2.4-1.2 3.75-3.6 3.75Zm0 2c-2.2 0-3.6-1.25-3.6-3.5 2.2 0 3.6 1.25 3.6 3.5Z" />
      </svg>
    );
  }
  const Icon = icons[kind];
  return <Icon size={size} strokeWidth={1.65} aria-hidden="true" className="navigation-icon" />;
}
