import type { ButtonHTMLAttributes, ReactNode } from "react";
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
}
/**
 * Minimal shared UI primitive. Shared components carry no business logic; they
 * only standardize the visual surface of the plugin's own UI islands.
 */
export declare function Button({ children, ...rest }: ButtonProps): JSX.Element;
//# sourceMappingURL=Button.d.ts.map