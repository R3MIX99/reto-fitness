"use client";

import { Drawer as VaulDrawer } from "vaul";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Drawer({ open, onClose, children }: DrawerProps) {
  return (
    <VaulDrawer.Root
      open={open}
      onOpenChange={(o) => { if (!o) onClose(); }}
    >
      <VaulDrawer.Portal>
        <VaulDrawer.Overlay className="fixed inset-0 z-[70]" style={{ background: "var(--color-overlay)" }} />
        <VaulDrawer.Content
          className="fixed bottom-0 left-0 right-0 z-[80] bg-[var(--color-bg-card)] rounded-t-[24px] outline-none flex flex-col"
          style={{ maxHeight: "92dvh" }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--color-border)" }} />
          </div>
          <div className="overflow-y-auto" style={{ overscrollBehavior: "contain" }}>
            {children}
          </div>
        </VaulDrawer.Content>
      </VaulDrawer.Portal>
    </VaulDrawer.Root>
  );
}
