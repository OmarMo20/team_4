'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield } from 'lucide-react';
import { AuthLayout } from '@/components/layouts';
import { OTPInput, Button } from '@/components/ui';
import { verifyUserOTP, resendUserOTP, validateUserOTP } from '@/features/auth/auth.service';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { extractErrorMessage } from '@/lib/utils';

function VerifyOTPContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { login } = useAuth();

    const email = searchParams?.get('email') ?? '';
    const type = (searchParams?.get('type') ?? 'registration') as 'registration' | 'password-reset';

    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);

    // Redirect if no email
    useEffect(() => {
        if (!email) {
            router.push(ROUTES.LOGIN);
        }
    }, [email, router]);

    // Resend timer countdown
    useEffect(() => {
        if (resendTimer > 0) {
            const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
            return () => clearTimeout(timer);
        } else {
            setCanResend(true);
        }
    }, [resendTimer]);

    const handleOTPComplete = useCallback(async (otpValue: string) => {
        if (isLoading) return;

        setIsLoading(true);
        setError('');

        try {
            if (type === 'password-reset') {
                await validateUserOTP(email, otpValue, type);
                router.push(`${ROUTES.RESET_PASSWORD}?email=${encodeURIComponent(email)}&otp=${otpValue}`);
                return;
            }

            const { user, token } = await verifyUserOTP({ email, otp: otpValue });
            login(user, token);
            // Redirect assistants to attendance page, others to dashboard
            if (user.role === 'assistant') {
                router.push(ROUTES.ATTENDANCE);
            } else {
                router.push(ROUTES.DASHBOARD);
            }
        } catch (err) {
            setError(extractErrorMessage(err));
            setOtp('');
        } finally {
            setIsLoading(false);
        }
    }, [email, type, login, router, isLoading]);

    const handleResend = async () => {
        if (!canResend || isLoading) return;

        try {
            await resendUserOTP(email, type);
            setResendTimer(60);
            setCanResend(false);
            setError('');
        } catch (err) {
            setError(extractErrorMessage(err));
        }
    };

    const getTitle = () => {
        return type === 'password-reset' ? 'Forgot Password' : 'Enter Activation Code';
    };

    const getSubtitle = () => {
        return `Enter the code sent to ${email}`;
    };

    return (
        <AuthLayout title={getTitle()} subtitle={getSubtitle()}>
            <div className="flex flex-col items-center">
                {/* Icon */}
                <div className="mb-4 xs:mb-6 p-3 xs:p-4 bg-indigo-100 rounded-full">
                    <Shield className="h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 text-indigo-600" />
                </div>

                {/* OTP Input */}
                <div className="w-full mb-4 xs:mb-6">
                    <OTPInput
                        value={otp}
                        onChange={setOtp}
                        onComplete={handleOTPComplete}
                        error={error}
                        disabled={isLoading}
                    />
                </div>

                {/* Resend Link */}
                <div className="mb-4 xs:mb-6 text-xs xs:text-sm text-gray-500 text-center px-2">
                    <div className="leading-relaxed">
                        Didn't receive a code?{' '}
                        {canResend ? (
                            <button
                                onClick={handleResend}
                                className="text-indigo-600 hover:underline font-medium"
                                disabled={isLoading}
                            >
                                Resend
                            </button>
                        ) : (
                            <span className="text-[#80848E]">
                                Resend ({resendTimer}s)
                            </span>
                        )}
                    </div>
                </div>

                {/* Submit Button */}
                <Button
                    onClick={() => otp.length === 6 && handleOTPComplete(otp)}
                    className="w-full text-sm xs:text-base"
                    size="lg"
                    isLoading={isLoading}
                    disabled={otp.length !== 6}
                >
                    {type === 'password-reset' ? 'Continue' : 'Finish'}
                </Button>
            </div>
        </AuthLayout>
    );
}

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={
            <AuthLayout title="Loading...">
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                </div>
            </AuthLayout>
        }>
            <VerifyOTPContent />
        </Suspense>
    );
}
