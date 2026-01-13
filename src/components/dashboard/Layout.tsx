import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen relative">
            <Sidebar />

            {/* Main Content */}
            <main className="flex-1 min-h-screen p-8 min-w-0">
                {children}
            </main>
        </div>
    );
}
