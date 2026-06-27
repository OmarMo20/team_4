'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { AuthLayout } from '@/components/layouts';
import { Input, Button } from '@/components/ui';
import { loginUser } from '@/features/auth/auth.service';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { extractErrorMessage } from '@/lib/utils';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
    const [isLoading, setIsLoading] = useState(false);

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email address';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters long';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);
        setErrors({});

        try {
            const { user, token } = await loginUser(formData);
            login(user, token);
            // Redirect assistants to attendance page, others to dashboard
            if (user.role === 'assistant') {
                router.push(ROUTES.ATTENDANCE);
            } else {
                router.push(ROUTES.DASHBOARD);
            }
        } catch (error) {
            setErrors({
                general: extractErrorMessage(error),
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout title="Login">
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* General Error */}
                {errors.general && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center">
                        {errors.general}
                    </div>
                )}

                {/* Email Field */}
                <Input
                    type="email"
                    label="Email Address"
                    placeholder="Enter your email"
                    icon="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    error={errors.email}
                    disabled={isLoading}
                />

                {/* Password Field */}
                <Input
                    type="password"
                    label="Password"
                    placeholder="xxxxxxxx"
                    icon="password"
                    showPasswordToggle
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    error={errors.password}
                    disabled={isLoading}
                />

                {/* Forgot Password Link */}
                <div className="text-right">
                    <Link
                        href={ROUTES.FORGOT_PASSWORD}
                        className="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
                    >
                        Forgot Password
                    </Link>
                </div>

                {/* Submit Button */}
                <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    isLoading={isLoading}
                    leftIcon={!isLoading ? <LogIn className="h-5 w-5" /> : undefined}
                >
                    Login
                </Button>

                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">OR</span>
                    </div>
                </div>

                <Link href="/portal" className="block w-full">
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full border-2 hover:bg-[#FCFCFC]"
                        size="lg"
                    >
                        Login as Student
                    </Button>
                </Link>

                {/* Register Link */}
                <p className="text-center text-sm text-gray-500 mt-6">
                    Don't have an account?{' '}
                    <Link href={ROUTES.REGISTER} className="text-indigo-600 hover:underline font-medium">
                        Create Account
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
