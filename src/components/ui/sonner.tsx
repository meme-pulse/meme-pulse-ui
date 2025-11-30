import { Toaster as Sonner } from 'sonner';
import type { ToasterProps } from 'sonner';
import { RetroToast } from './retro-toast';

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'p-0 bg-transparent shadow-none',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, RetroToast };
