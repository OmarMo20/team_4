'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { AuthLayout } from '@/components/layouts';
import { Input, Button } from '@/components/ui';
import { registerUser } from '@/features/auth/auth.service';
import { ROUTES } from '@/lib/constants';

import { extractErrorMessage, extractFormErrors } from '@/lib/utils';

export default function RegisterPage() {
    const router = useRouter();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        subject: '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(false);

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!formData.name || formData.name.trim().length < 2) {
            newErrors.name = 'Name is required (at least 2 characters)';
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email address';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters long';
        }

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
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
            const { email } = await registerUser({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                phone: formData.phone || undefined,
                subject: formData.subject || undefined,
            });

            // Redirect to OTP verification with email in query
            router.push(`${ROUTES.VERIFY_OTP}?email=${encodeURIComponent(email)}&type=registration`);

        } catch (error) {
            setErrors(extractFormErrors(error));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AuthLayout title="Create a New Account">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* General Error */}
                {errors.general && (
                    <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center">
                        {errors.general}
                    </div>
                )}

                {/* Name Field */}
                <Input
                    type="text"
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    error={errors.name}
                    disabled={isLoading}
                />

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

                {/* Phone Field */}
                <Input
                    type="tel"
                    label="Phone Number (Optional)"
                    placeholder="01xxxxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={isLoading}
                />

                {/* Subject Field */}
                <Input
                    type="text"
                    label="Subject You Teach (Optional)"
                    placeholder="e.g. Mathematics, Arabic, Science..."
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
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

                {/* Confirm Password Field */}
                <Input
                    type="password"
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    icon="password"
                    showPasswordToggle
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    error={errors.confirmPassword}
                    disabled={isLoading}
                />

                {/* Submit Button */}
                <Button
                    type="submit"
                    className="w-full"
                    size="lg"
                    isLoading={isLoading}
                    leftIcon={!isLoading ? <UserPlus className="h-5 w-5" /> : undefined}
                >
                    Create Account
                </Button>

                {/* Login Link */}
                <p className="text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link href={ROUTES.LOGIN} className="text-indigo-600 hover:underline font-medium">
                        Login
                    </Link>
                </p>
            </form>
        </AuthLayout>
    );
}
