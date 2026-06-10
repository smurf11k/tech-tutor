import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { CatalogSection } from "@/components/home/CatalogSection";

const defaultFilters = {
  q: "",
  category: "",
  level: "",
  price_type: "",
  sort: "newest",
};

export default function CoursesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = useMemo(
    () => ({
      q: searchParams.get("q") || defaultFilters.q,
      category: searchParams.get("category") || defaultFilters.category,
      level: searchParams.get("level") || defaultFilters.level,
      price_type: searchParams.get("price_type") || defaultFilters.price_type,
      sort: searchParams.get("sort") || defaultFilters.sort,
    }),
    [searchParams],
  );

  function handleFiltersChange(nextFilters) {
    const params = new URLSearchParams(searchParams);

    Object.keys(defaultFilters).forEach((key) => {
      params.delete(key);
    });

    Object.entries(nextFilters).forEach(([key, value]) => {
      const normalized = typeof value === "string" ? value.trim() : value;
      const defaultValue = defaultFilters[key];

      if (
        normalized === "" ||
        normalized === defaultValue ||
        normalized == null
      ) {
        return;
      }

      params.set(key, String(normalized));
    });

    setSearchParams(params, { replace: true });
  }

  return (
    <section className="home-shell py-9 space-y-6">
      <CatalogSection
        previewOnly={false}
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />
    </section>
  );
}
