export default function Card({ as: Tag = 'div', className = '', children, ...props }) {
  return (
    <Tag className={`panel p-5 ${className}`} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ eyebrow, title, description, action }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
        <h2 className="font-display text-lg font-bold text-white">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
