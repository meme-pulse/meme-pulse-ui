import { TypingAnimation } from '@/components/magicui/typing-animation';

interface PageHeaderProps {
  title: string;
  description: React.ReactNode;
  icon?: React.ReactNode;
  rightContent?: React.ReactNode;
  badge?: React.ReactNode;
  /** Key for TypingAnimation to trigger re-render on title change */
  titleKey?: string;
}

export function PageHeader({ title, description, icon, rightContent, badge, titleKey }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {badge && <div className="mb-8">{badge}</div>}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <TypingAnimation
              as="h1"
              className="text-white text-[24px] sm:text-[32px] md:text-[42px] leading-tight tracking-[-1.68px]"
              style={{ fontFamily: '"Press Start 2P", cursive' }}
              duration={50}
              key={titleKey}
            >
              {title}
            </TypingAnimation>
            {icon && <div className="flex-shrink-0 opacity-80">{icon}</div>}
          </div>
          <div className="mt-6 sm:mt-[38px]">
            {typeof description === 'string' ? (
              <p className="font-roboto text-zinc-400 text-[14px] sm:text-[16px] leading-normal max-w-[854px]">{description}</p>
            ) : (
              description
            )}
          </div>
        </div>
        {rightContent}
      </div>
    </div>
  );
}
