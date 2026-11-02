/** The red asterisk after a required field's label; screen readers hear "required" */
export default function RequiredMark() {
  return (
    <>
      <span className="text-red-500" aria-hidden="true">
        *
      </span>
      <span className="sr-only">(required)</span>
    </>
  );
}
