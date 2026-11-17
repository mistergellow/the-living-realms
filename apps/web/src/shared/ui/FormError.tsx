import { ApiError } from '../../lib/api';

export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof ApiError ? error.message : 'Something went wrong.';
  return (
    <div className="alert alert-error" role="alert">
      {message}
    </div>
  );
}
