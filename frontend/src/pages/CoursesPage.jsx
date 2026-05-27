import { CatalogSection } from "@/components/home/CatalogSection";

export default function CoursesPage() {
  return (
    <section className="home-shell py-9 space-y-6">
      <CatalogSection previewOnly={false} />
    </section>
  );
}
