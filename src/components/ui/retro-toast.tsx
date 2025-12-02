import { toast } from 'sonner';
import { X, Minus, Square } from 'lucide-react';

// Get emoji based on toast type
function getToastIcon(type?: string) {
  switch (type) {
    case 'success':
      return '✅';
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '📊';
  }
}

// Get title based on toast type
function getToastTitle(type?: string) {
  switch (type) {
    case 'success':
      return 'Success';
    case 'error':
      return 'Error';
    case 'warning':
      return 'Warning';
    case 'info':
      return 'Information';
    default:
      return 'Transaction Details';
  }
}

// Windows 95 style button
function Win95Button({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="size-[18px] bg-figma-gray-bg border-[2px] border-white flex items-center justify-center
        shadow-[inset_-1px_-1px_0px_0px_#808088,inset_1px_1px_0px_0px_#f9f9fa]
        active:shadow-[inset_1px_1px_0px_0px_#808088,inset_-1px_-1px_0px_0px_#f9f9fa]
        hover:brightness-95 transition-all"
    >
      {children}
    </button>
  );
}

// Custom toast component matching Windows 95 style
interface RetroToastProps {
  title?: string;
  description?: string;
  type?: 'success' | 'error' | 'warning' | 'info' | 'default';
  onClose?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

function RetroToast({ title, description, type = 'default', onClose, action }: RetroToastProps) {
  const icon = getToastIcon(type);
  const displayTitle = title || getToastTitle(type);

  return (
    <div className="bg-figma-gray-bg border-[2px] border-white shadow-[2px_2px_0px_0px_#000] min-w-[340px] max-w-[420px]">
      {/* Title bar */}
      <div className="bg-gradient-to-r from-figma-purple-dark to-figma-purple-light h-[28px] flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <span className="text-sm">{icon}</span>
          <span className="text-white text-sm font-bold font-['Tahoma',sans-serif] truncate">
            {displayTitle}
          </span>
        </div>
        <div className="flex items-center gap-[2px]">
          <Win95Button>
            <Minus className="size-3 text-figma-text-dark" strokeWidth={2.5} />
          </Win95Button>
          <Win95Button>
            <Square className="size-2.5 text-figma-text-dark" strokeWidth={2.5} />
          </Win95Button>
          <Win95Button onClick={onClose}>
            <X className="size-3 text-figma-text-dark" strokeWidth={2.5} />
          </Win95Button>
        </div>
      </div>

      {/* Content area */}
      <div className="p-2">
        <div
          className="bg-white p-4 shadow-[inset_1px_1px_0px_0px_#808088,inset_-1px_-1px_0px_0px_#f9f9fa]"
        >
          {title && (
            <p className="text-figma-text-dark text-base font-normal font-['Roboto',sans-serif] mb-1">
              {title}
            </p>
          )}
          {description && (
            <p className="text-figma-text-dark text-sm font-normal font-['Roboto',sans-serif] opacity-80">
              {description}
            </p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="mt-3 px-3 py-1 bg-figma-gray-bg border-[2px] border-white text-figma-text-dark text-xs font-bold
                shadow-[inset_-1px_-1px_0px_0px_#808088,inset_1px_1px_0px_0px_#f9f9fa]
                active:shadow-[inset_1px_1px_0px_0px_#808088,inset_-1px_-1px_0px_0px_#f9f9fa]
                hover:brightness-95 transition-all"
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions to show toasts with the retro style
const retroToast = {
  success: (title: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    toast.custom(
      (t) => (
        <RetroToast
          title={title}
          description={options?.description}
          type="success"
          action={options?.action}
          onClose={() => toast.dismiss(t)}
        />
      ),
      { duration: 5000 }
    );
  },
  error: (title: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    toast.custom(
      (t) => (
        <RetroToast
          title={title}
          description={options?.description}
          type="error"
          action={options?.action}
          onClose={() => toast.dismiss(t)}
        />
      ),
      { duration: 5000 }
    );
  },
  info: (title: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    toast.custom(
      (t) => (
        <RetroToast
          title={title}
          description={options?.description}
          type="info"
          action={options?.action}
          onClose={() => toast.dismiss(t)}
        />
      ),
      { duration: 5000 }
    );
  },
  warning: (title: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    toast.custom(
      (t) => (
        <RetroToast
          title={title}
          description={options?.description}
          type="warning"
          action={options?.action}
          onClose={() => toast.dismiss(t)}
        />
      ),
      { duration: 5000 }
    );
  },
  default: (title: string, options?: { description?: string; action?: { label: string; onClick: () => void } }) => {
    toast.custom(
      (t) => (
        <RetroToast
          title={title}
          description={options?.description}
          type="default"
          action={options?.action}
          onClose={() => toast.dismiss(t)}
        />
      ),
      { duration: 5000 }
    );
  },
};

export { retroToast, RetroToast };



