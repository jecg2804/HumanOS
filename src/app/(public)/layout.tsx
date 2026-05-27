export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-navy-50 via-background to-navy-100/40 px-4 py-12">
      {children}
    </div>
  );
}
