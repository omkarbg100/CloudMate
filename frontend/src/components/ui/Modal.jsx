import { X } from "lucide-react";

export function Modal({ open, onClose, title, children, footer, width = "max-w-lg" }) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center overflow-auto bg-black/60 p-6 pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className={`w-full ${width} overflow-hidden rounded-lg border border-studio-line2 bg-studio-panel shadow-modal`}>
        <header className="flex h-11 items-center justify-between border-b border-studio-line px-4">
          <h2 className="text-sm font-semibold text-studio-text">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-studio-muted hover:bg-studio-panel2 hover:text-studio-text"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="studio-scrollbar max-h-[70vh] overflow-auto p-4">{children}</div>
        {footer ? <footer className="flex items-center justify-end gap-2 border-t border-studio-line p-3">{footer}</footer> : null}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, children, confirmLabel = "Confirm", danger = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="h-8 rounded-md border border-studio-line2 px-3 text-xs text-studio-muted hover:bg-studio-panel2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-8 rounded-md px-3 text-xs text-white ${
              danger ? "bg-rose-500/90 hover:bg-rose-500" : "bg-studio-accent hover:bg-studio-accentHi"
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      {children}
    </Modal>
  );
}