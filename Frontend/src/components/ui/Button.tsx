'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import Spinner from '@/components/ui/Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            children,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            leftIcon,
            rightIcon,
            disabled,
            className = '',
            ...props
        },
        ref
    ) => {
        const baseStyles = `
            inline-flex items-center justify-center
            font-bold rounded-xl
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-2
            disabled:opacity-50 disabled:cursor-not-allowed
        `;

        const variants = {
            primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 shadow-2xl',
            secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500',
            outline: 'border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500',
            ghost: 'text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500',
        };

        const sizes = {
            sm: 'px-4 py-2 text-sm',
            md: 'px-5 py-3 text-base',
            lg: 'px-6 py-4 text-lg',
        };

        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                {...props}
            >
                {isLoading ? (
                    <>
                        <Spinner size="sm" className="mr-2" />
                        <span>Loading...</span>
                    </>
                ) : (
                    <>
                        {leftIcon && <span className="mr-2">{leftIcon}</span>}
                        {children}
                        {rightIcon && <span className="ml-2">{rightIcon}</span>}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

export default Button;
