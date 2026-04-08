type ErrorSummaryProps = {
  errors: Record<string, { message?: string } | undefined>;
};

export function ErrorSummary({ errors }: ErrorSummaryProps) {
  const messages = Object.values(errors)
    .map((error) => error?.message)
    .filter(Boolean) as string[];

  if (messages.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      <ul className="space-y-1">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  );
}
