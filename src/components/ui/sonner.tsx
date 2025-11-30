import { useTheme } from 'next-themes';
import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-surface-muted group-[.toaster]:text-text-primary group-[.toaster]:border-surface-muted group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:text-text-secondary',
          actionButton: 'group-[.toast]:bg-accent-primary group-[.toast]:text-surface-default',
          cancelButton: 'group-[.toast]:bg-border-subtle group-[.toast]:text-text-secondary',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
