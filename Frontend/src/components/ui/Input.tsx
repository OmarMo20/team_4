'use client';

import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: 'email' | 'password' | 'none';
    showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon = 'none', type = 'text', showPasswordToggle = false, className = '', ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        const isPasswordType = type === 'password';
        const inputType = isPasswordType && showPassword ? 'text' : type;

        const getIcon = () => {
            if (icon === 'email') return <Mail className="h-5 w-5 text-indigo-500" />;
            if (icon === 'password') return <Lock className="h-5 w-5 text-[#80848E]" />;
            return null;
        };

        return (
            <div className="w-full" dir="rtl">
                {label && (
                    <label className="block text-sm font-medium text-gray-500 mb-2 text-right">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {/* Left icon - show/hide password */}
                    {isPasswordType && showPasswordToggle && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#80848E] hover:text-gray-500 focus:outline-none z-10"
                            tabIndex={-1}
                        >
                            {showPassword ? (
                                <EyeOff className="h-5 w-5" />
                            ) : (
                                <Eye className="h-5 w-5" />
                            )}
                        </button>
                    )}

                    <input
                        ref={ref}
                        type={inputType}
                        className={`
                            w-full px-4 py-3.5
                            bg-white
                            border border-gray-200 rounded-xl
                            text-right text-gray-900
                            placeholder:text-[#80848E]
                            focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent
                            transition-all duration-200
                            ${icon !== 'none' ? 'pr-12' : ''}
                            ${isPasswordType && showPasswordToggle ? 'pl-12' : ''}
                            ${error ? 'border-red-400 focus:ring-red-400' : ''}
                            ${className}
                        `}
                        {...props}
                    />

                    {/* Right icon */}
                    {icon !== 'none' && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            {getIcon()}
                        </div>
                    )}
                </div>
                {error && (
                    <p className="mt-1.5 text-sm text-red-500 text-right">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
