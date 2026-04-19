"use client";

import { useFormStatus } from "react-dom";
import { signOutAction } from "@/app/(auth)/actions";

export const LogoutButton = (): React.ReactElement => (
  <form action={signOutAction}>
    <LogoutButtonInner />
  </form>
);

const LogoutButtonInner = (): React.ReactElement => {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Cerrar sesión"
      className="group inline-flex items-center gap-2 rounded-full hairline bg-ink-800/50 backdrop-blur px-4 py-2 text-[13px] text-ink-100 transition-all duration-200 hover:bg-ink-700 hover:text-ink-50 disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Saliendo…
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden className="transition-transform group-hover:translate-x-0.5">
            <path d="M6 2H2v10h4M9 4l3 3-3 3M12 7H5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Cerrar sesión
        </>
      )}
    </button>
  );
};
