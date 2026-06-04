// Type helper: Next.js 14 form `action` props require `Promise<void>`.
// Our server actions return `{ error, success }` for client component use.
// This cast lets them work in both contexts.
export function formAction(
  action: (formData: FormData) => Promise<unknown>
): (formData: FormData) => Promise<void> {
  return action as (formData: FormData) => Promise<void>;
}
