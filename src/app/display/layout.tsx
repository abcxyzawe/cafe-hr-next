export const metadata = {
  title: "Cafe HR — Office Display",
};

export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-stone-950 text-white">
      {children}
    </div>
  );
}
