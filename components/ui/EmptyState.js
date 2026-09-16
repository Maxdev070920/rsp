import Button from './Button';

export default function EmptyState({ icon = '✦', title, description, actionLabel, actionHref, onAction }) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div
        aria-hidden="true"
        className="flex h-14 w-14 items-center justify-center rounded-full border border-arena-edge bg-arena-deep text-2xl text-nebula"
      >
        {icon}
      </div>
      <h3 className="font-display text-lg font-bold text-white">{title}</h3>
      <p className="max-w-md text-sm text-slate-400">{description}</p>
      {(actionHref || onAction) && (
        <Button href={actionHref} onClick={onAction} variant="primary" size="sm" className="mt-2">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
