import PublicNav from "./PublicNav";
import PublicFooter from "./PublicFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </>
  );
}
