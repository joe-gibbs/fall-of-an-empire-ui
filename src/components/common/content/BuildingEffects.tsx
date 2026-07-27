import { renderRichText } from '../../../utils/richText';

interface BuildingEffectsProps {
  text?: string;
  className?: string;
}

export default function BuildingEffects({ text, className }: BuildingEffectsProps) {
  if (!text) return null;

  const classes = className
    ? `building-effects ${className}`
    : 'building-effects';

  return (
    <div className={classes}>
      {renderRichText(text, { blockBullets: true })}
    </div>
  );
}
