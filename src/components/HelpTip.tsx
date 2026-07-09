interface HelpTipProps {
  text: string;
  label?: string;
}

export function HelpTip({ text, label = 'Xem hướng dẫn' }: HelpTipProps) {
  return (
    <span className="help-tip" tabIndex={0} aria-label={`${label}: ${text}`}>
      <span aria-hidden="true">?</span>
      <span className="help-tip-bubble" role="tooltip">{text}</span>
    </span>
  );
}
