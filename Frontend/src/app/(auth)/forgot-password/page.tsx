'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { AuthLayout } from '@/components/layouts';
import { Input, Button } from '@/components/ui';
import { forgotUserPassword } from '@/features/auth/auth.service';
import { ROUTES } from '@/lib/constants';

export default function ForgotPasswordPage() {
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const validateEmail = () => {
        if (!email) {
            setError('Email is required');
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Invalid email address');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateEmail()) return;

        setIsLoading(true);
        setError('');

        try {
            await forgotUserPassword(email);
            // Redirect to OTP verification
            router.push(`${ROUTES.VERIFY_OTP}?email=${encodeURIComponent(email)}&type=password-reset`);
        } catch (err) {
            // Still redirect even on error (security - don't reveal if email exists)
            router.push(`${ROUTES.VERIFY_OTP}?email=${encodeURIComponent(email)}&type=password-reset`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout title="Forgot Password" subtitle="Enter your email to send the verification code">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Error */}
                {error && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center">
                        {error}
                    </div>
                )}

                {/* Email Field */}
                <Input
                    type="email"
                    label="Email Address"
                    placeholder="Enter your email"
                    icon="email"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        setError('');
                    }}
                    error={error}
                    disabled={isLoading}
                />

                {/* Submit Button */}
                <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    isLoading={isLoading}
                    leftIcon={!isLoading ? <Mail className="h-5 w-5" /> : undefined}
                >
                    Send Verification Code
                </Button>

                {/* Back to Login */}
                <p className="text-center text-sm text-gray-500">
                    Remembered your password?{' '}
                    <Link href={ROUTES.LOGIN} className="text-indigo-600 hover:underline font-medium">
                        Login
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
