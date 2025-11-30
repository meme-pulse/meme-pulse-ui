import { Button } from '../ui/button';

export default function PoolLearnCard({
  title,
  description,
  buttonText,
}: {
  title: string;
  description: React.ReactNode;
  buttonText: string;
}) {
  return (
    <div
      className="rounded-[6px] bg-card p-5 border border-zinc-200/20"
      style={{
        boxShadow: '0 2px 4px 0 rgba(9, 9, 11, 0.04), 0 4px 8px 0 rgba(9, 9, 11, 0.04)',
      }}
    >
      <div className="text-semantic-title">{title}</div>
      <div className="text-semantic-description text-semantic-third mt-1">{description}</div>
      <div className="mt-4 flex items-center text-sm">
        <Button variant="outline" size="sm" className="  text-semantic-secondary h-9 " type="button">
          {buttonText}
        </Button>
      </div>
    </div>
  );
}
