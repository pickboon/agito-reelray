import PublicNav from "@/components/layout/PublicNav";
import PublicFooter from "@/components/layout/PublicFooter";

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
      <PublicFooter />
    </>
  );
}
