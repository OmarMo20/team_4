import Image from 'next/image';

interface AuthLayoutProps {
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
    showLogo?: boolean;
}

export default function AuthLayout({
    children,
    title,
    subtitle,
    showLogo = true
}: AuthLayoutProps) {
    return (
        <div className="min-h-screen bg-[#f8f9fa] flex flex-col" dir="rtl">
            {/* Logo Section - At the very top */}
            {showLogo && (
                <div className="pt-4 xs:pt-6 pb-4 xs:pb-6 flex flex-col items-center">
                    <div className="relative w-48 h-32 xs:w-56 xs:h-36 sm:w-60 sm:h-40">
                        <Image
                            src="/logo.png"
                            alt="ClassTrack Logo"
                            fill
                            className="object-contain mix-blend-multiply"
                            priority
                        />
                    </div>
                </div>
            )}

            {/* Card Section */}
            <div className="flex-1 flex items-start justify-center px-3 xs:px-4 sm:px-6 lg:px-8">
                <div className="w-full max-w-lg">
                    <div className="bg-white rounded-xl xs:rounded-2xl p-4 xs:p-6 sm:p-8 border border-black/5 shadow-sm">
                        {/* Title */}
                        {title && (
                            <h2 className="text-lg xs:text-xl sm:text-2xl font-bold text-gray-900 text-center mb-4 xs:mb-6">
                                {title}
                            </h2>
                        )}

                        {/* Subtitle */}
                        {subtitle && (
                            <p className="text-xs xs:text-sm text-indigo-600 text-center mb-3 xs:mb-4 px-2 leading-relaxed">
                                {subtitle}
                            </p>
                        )}

                        {/* Content */}
                        {children}
                    </div>
                </div>
            </div>

            {/* Bottom spacing */}
            <div className="pb-8"></div>
        </div>
    );
}
