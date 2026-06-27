'use client';

import { useRef, useState, useCallback, useEffect, type KeyboardEvent, type ClipboardEvent } from 'react';

interface OTPInputProps {
    length?: number;
    value?: string;
    onChange: (otp: string) => void;
    onComplete?: (otp: string) => void;
    error?: string;
    disabled?: boolean;
}

const OTPInput = ({
    length = 6,
    value = '',
    onChange,
    onComplete,
    error,
    disabled = false,
}: OTPInputProps) => {
    const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Sync with external value
    useEffect(() => {
        if (value) {
            const otpArray = value.split('').slice(0, length);
            while (otpArray.length < length) {
                otpArray.push('');
            }
            setOtp(otpArray);
        }
    }, [value, length]);

    const focusInput = useCallback((index: number) => {
        if (index >= 0 && index < length) {
            inputRefs.current[index]?.focus();
        }
    }, [length]);

    const handleChange = useCallback((index: number, digit: string) => {
        if (disabled) return;

        // Only allow single digit
        const sanitized = digit.replace(/[^0-9]/g, '').slice(-1);

        const newOtp = [...otp];
        newOtp[index] = sanitized;
        setOtp(newOtp);

        const otpString = newOtp.join('');
        onChange(otpString);

        // Auto-focus next input if value entered
        if (sanitized && index < length - 1) {
            focusInput(index + 1);
        }

        // Call onComplete if all digits filled
        if (sanitized && newOtp.every(v => v !== '')) {
            onComplete?.(otpString);
        }
    }, [otp, onChange, onComplete, length, focusInput, disabled]);

    const handleKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        if (e.key === 'Backspace') {
            e.preventDefault();

            const newOtp = [...otp];

            if (otp[index]) {
                // Clear current input
                newOtp[index] = '';
                setOtp(newOtp);
                onChange(newOtp.join(''));
            } else if (index > 0) {
                // Move to previous input and clear it
                newOtp[index - 1] = '';
                setOtp(newOtp);
                onChange(newOtp.join(''));
                focusInput(index - 1);
            }
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            focusInput(index + 1); // RTL - right is previous
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            focusInput(index - 1); // RTL - left is next
        }
    }, [otp, onChange, focusInput, disabled]);

    const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
        if (disabled) return;

        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, length);

        if (pastedData.length > 0) {
            const newOtp = Array(length).fill('');
            pastedData.split('').forEach((digit, i) => {
                newOtp[i] = digit;
            });
            setOtp(newOtp);

            const otpString = newOtp.join('');
            onChange(otpString);

            // Focus last filled input or next empty
            const lastFilledIndex = pastedData.length - 1;
            focusInput(Math.min(lastFilledIndex + 1, length - 1));

            if (newOtp.every(v => v !== '')) {
                onComplete?.(otpString);
            }
        }
    }, [onChange, onComplete, length, focusInput, disabled]);

    return (
        <div className="w-full" dir="ltr">
            <div className="flex justify-center gap-1.5 xs:gap-2 sm:gap-3 px-2">
                {otp.map((digit, index) => (
                    <input
                        key={index}
                        ref={(el) => { inputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        disabled={disabled}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        onPaste={handlePaste}
                        className={`
                            w-9 h-11 xs:w-10 xs:h-12 sm:w-12 sm:h-14 md:w-14 md:h-16
                            text-center text-base xs:text-lg sm:text-xl font-semibold
                            bg-white
                            border-2 rounded-lg sm:rounded-xl
                            focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-indigo-400
                            transition-all duration-200
                            disabled:bg-gray-100 disabled:cursor-not-allowed
                            ${error
                                ? 'border-red-400 focus:ring-red-400'
                                : digit
                                    ? 'border-indigo-400'
                                    : 'border-gray-200 hover:border-[#35373C]'
                            }
                        `}
                    />
                ))}
            </div>
            {error && (
                <p className="mt-3 text-xs xs:text-sm text-red-500 text-center px-2">{error}</p>
            )}
        </div>
    );
};

export default OTPInput;
