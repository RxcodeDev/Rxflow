import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: ReactNode;
  error?: string;
}

export default function Input({ label, icon, error, id, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-[0.375rem]">
      {label && (
        <label
          htmlFor={id}
          className="text-[0.75rem] font-semibold text-[var(--c-text-sub)] tracking-[0.02em]"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span
            className="
              absolute left-3 flex items-center text-[var(--c-muted)] pointer-events-none
              [&_svg]:w-4 [&_svg]:h-4 [&_svg]:stroke-current [&_svg]:fill-none
              [&_svg]:[stroke-width:1.5] [&_svg]:[stroke-linecap:round] [&_svg]:[stroke-linejoin:round]
            "
          >
            {icon}
          </span>
        )}
        <input
          id={id}
          className={`
            w-full ${icon ? 'pl-[2.375rem]' : 'pl-3'} pr-3 py-[0.625rem]
            border rounded-[0.625rem] text-sm font-[inherit]
            text-[var(--c-text)] bg-[var(--c-bg)] outline-none
            transition-[border-color,box-shadow] duration-[0.25s]
            placeholder:text-[var(--c-muted)]
            focus:border-[var(--c-text-sub)] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.06)]
            ${error ? 'border-[var(--c-danger)]' : 'border-[var(--c-border)]'}
            ${className ?? ''}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-[0.75rem] text-[var(--c-danger)] mt-0.5">{error}</p>
      )}
    </div>
  );
}
