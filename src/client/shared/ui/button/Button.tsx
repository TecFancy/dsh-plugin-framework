import type { ButtonHTMLAttributes, ReactNode } from "react";
import css from "./Button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

/**
 * Minimal shared UI primitive. Shared components carry no business logic; they
 * only standardize the visual surface of the plugin's own UI islands.
 */
export function Button({ children, ...rest }: ButtonProps): JSX.Element {
  return (
    <button type="button" className={css["button"]} {...rest}>
      {children}
    </button>
  );
}
