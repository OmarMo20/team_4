export default function PortalLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <div className="min-h-screen bg-[#FCFCFC] font-sans" dir="ltr">
        <header className="bg-white border-b py-4 mb-8">
            <div className="container mx-auto px-4 text-center">
                <h1 className="text-2xl font-bold text-primary-600">Student Portal</h1>
            </div>
        </header>
        <main className="container mx-auto px-4 pb-12">
          {children}
        </main>
      </div>
    );
  }
