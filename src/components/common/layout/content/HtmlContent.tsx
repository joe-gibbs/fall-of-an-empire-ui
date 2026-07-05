interface HtmlContentProps {
  html?: string | null;
  className?: string;
}

export default function HtmlContent({ html, className }: HtmlContentProps) {
  if (!html) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
