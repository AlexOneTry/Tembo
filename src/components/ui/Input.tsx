import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, FieldProps {}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightIcon, className, id, ...rest },
  ref
) {
  const fieldId = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="text-xs font-medium text-soft">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-soft pointer-events-none">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          className={cn(
            'input-base',
            leftIcon && 'pl-9',
            rightIcon && 'pr-9',
            error && 'border-rose-500/50 focus:ring-rose-500/40',
            className
          )}
          {...rest}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-soft">
            {rightIcon}
          </span>
        )}
      </div>
      {error ? (
        <p className="text-xs text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-soft">{hint}</p>
      ) : null}
    </div>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldProps {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, children, ...rest },
  ref
) {
  const fieldId = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="text-xs font-medium text-soft">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={fieldId}
        className={cn('input-base appearance-none pr-8', error && 'border-rose-500/50', className)}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p className="text-xs text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-soft">{hint}</p>
      ) : null}
    </div>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldProps {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, id, ...rest },
  ref
) {
  const fieldId = id ?? rest.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={fieldId} className="text-xs font-medium text-soft">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        className={cn('input-base min-h-[88px] resize-y', error && 'border-rose-500/50', className)}
        {...rest}
      />
      {error ? (
        <p className="text-xs text-rose-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-soft">{hint}</p>
      ) : null}
    </div>
  );
});
