interface CardWithHeaderProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function CardWithHeader({ title, children, className = '', contentClassName = '' }: CardWithHeaderProps) {
  return (
    <div
      className={`bg-figma-gray-bg p-1 ${className}`}
      style={{
        boxShadow:
          'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc, inset -2px -2px 0px 0px #9c9c9c, inset 2px 2px 0px 0px #e8e8e8',
      }}
    >
      {/* Header Bar */}
      <div
        className="h-[24px] relative flex items-center"
        style={{
          background: 'linear-gradient(90deg, #170d2d 0%, #462886 100%)',
        }}
      >
        <div className="absolute left-[6px] top-[2px] w-4 h-[19px] flex items-center justify-center">
          <img src="/pixel_pulse_white.png" alt="logo" className="w-4 h-[19px] object-contain" />
        </div>
        <span className="absolute left-[24px] top-1/2 -translate-y-1/2 font-roboto text-white text-[12px] leading-[14px]">{title}</span>
      </div>

      {/* Content */}
      <div className={contentClassName}>{children}</div>
    </div>
  );
}

