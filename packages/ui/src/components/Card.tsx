import React from 'react';
import { cn } from '../utils';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'outline' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-2xl border transition-all duration-300',
          {
            'bg-slate-900/60 border-slate-800 shadow-xl shadow-slate-950/20':
              variant === 'default',
            'backdrop-blur-xl bg-slate-950/40 border-slate-800/80 shadow-2xl':
              variant === 'glass',
            'bg-transparent border-slate-800':
              variant === 'outline',
            'bg-slate-900/60 border-slate-800 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/5 hover:translate-y-[-2px]':
              variant === 'interactive',
          },
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
