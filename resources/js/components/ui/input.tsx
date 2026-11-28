import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, type, ...props }, ref) => {
    return (
        <input
            type={type}
            className={cn(
                'flex h-11 w-full rounded-lg border border-input bg-card px-2.5 py-1 text-base shadow-[inset_0_1px_1px_rgba(0,0,0,0.04)] file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground/70 focus-visible:border-[#d42a2a] focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-[#d42a2a]/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70 md:h-8 md:rounded-md md:text-[13px]',
                className,
            )}
            ref={ref}
            {...props}
        />
    );
});

Input.displayName = 'Input';

export { Input };
