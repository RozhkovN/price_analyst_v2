import type { MouseEvent, ReactNode } from "react";
import { m } from "framer-motion";
import clsx from "clsx";

const Button = ({
  children,
  primary = true,
  className = "",
  onClick,
  disabled = false,
  ...rest
}: {
  children: ReactNode;
  primary?: boolean;
  className?: string;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}) => (
  <m.button
    className={clsx(
      "rounded-lg px-6 py-3 text-lg font-medium transition-colors",
      disabled
        ? "border-gray-300 bg-gray-300 text-gray-500 shadow-none hover:bg-gray-300"
        : primary
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700"
          : "border-2 border-blue-200 text-blue-700 hover:bg-blue-50",
      disabled && "cursor-not-allowed opacity-50",
      className,
    )}
    whileHover={!disabled ? { scale: 1.05 } : {}}
    whileTap={!disabled ? { scale: 0.95 } : {}}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    {...rest}
  >
    {children}
  </m.button>
);

export default Button;
