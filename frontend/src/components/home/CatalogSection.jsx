import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CourseCard } from "@/components/common/CourseCard";
import { LoadingState } from "@/components/common/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import api from "@/lib/api";
import {
  extractList,
  getApiErrorMessage,
  getCourseRouteKey,
} from "@/lib/utils";

const defaultFilters = {
  q: "",
  category: "",
  level: "",
  price_type: "",
  sort: "newest",
};

export function CatalogSection({
  previewOnly = true,
  filters: controlledFilters,
  onFiltersChange,
}) {
  const {
    client,
    token,
    isInstructor,
    isAdmin,
    loading: authLoading,
  } = useAuth();
  const toast = useToast();
  const [localFilters, setLocalFilters] = useState(defaultFilters);
  const [catalogOptions, setCatalogOptions] = useState({
    categories: [],
    levels: [],
  });
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const filters = useMemo(
    () => ({
      ...defaultFilters,
      ...(controlledFilters || localFilters),
    }),
    [controlledFilters, localFilters],
  );

  const filtersKey = useMemo(
    () =>
      [
        filters.q,
        filters.category,
        filters.level,
        filters.price_type,
        filters.sort,
      ].join("|"),
    [filters],
  );

  function updateFilters(updater) {
    const nextFilters = {
      ...defaultFilters,
      ...(typeof updater === "function" ? updater(filters) : updater),
    };

    if (onFiltersChange) {
      onFiltersChange(nextFilters);
      return;
    }

    setLocalFilters(nextFilters);
  }

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;

    async function loadOptions() {
      try {
        const catalogClient = token ? client : api;
        const response = await catalogClient.get("/courses/catalog-options");
        if (!cancelled) {
          setCatalogOptions({
            categories: response.data.categories || [],
            levels: response.data.levels || [],
          });
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(
            getApiErrorMessage(err, "Failed to load filter options."),
          );
        }
      }
    }

    loadOptions();
    return () => {
      cancelled = true;
    };
  }, [token, client, authLoading, toast]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const catalogClient = token ? client : api;
        const response = await catalogClient.get("/courses", {
          params: filters,
        });
        if (!cancelled) {
          setCourses(extractList(response.data));
        }
      } catch (err) {
        if (!cancelled) {
          const message = getApiErrorMessage(err, "Failed to load courses.");
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [filtersKey, token, client, authLoading, toast]);

  const catalogDescription = isAdmin
    ? "All courses including drafts."
    : isInstructor
      ? "Published courses and your drafts."
      : "Browse published courses and start learning.";

  const [visibleCount, setVisibleCount] = useState(() => {
    if (typeof window === "undefined") return 1;
    const w = window.innerWidth;
    if (w >= 1024) return 3;
    if (w >= 768) return 2;
    return 1;
  });

  useEffect(() => {
    function onResize() {
      const w = window.innerWidth;
      if (w >= 1024) setVisibleCount(3);
      else if (w >= 768) setVisibleCount(2);
      else setVisibleCount(1);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <section id="catalog" className="scroll-mt-24 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] tracking-[0.12em] text-primary/70 mono-ui uppercase">
            // FEATURED
          </p>
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">
            Course catalog
          </h2>
          <p className="mt-1 text-xs text-[#555] mono-ui">
            {catalogDescription}
          </p>
        </div>
        {isInstructor ? (
          <Button asChild>
            <Link to="/instructor/courses/new">New course</Link>
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Card>
        <CardContent className="grid gap-4 pt-6 md:grid-cols-5">
          <label className="md:col-span-2 space-y-2 block">
            <Label htmlFor="q">Search</Label>
            <Input
              id="q"
              value={filters.q}
              onChange={(event) =>
                updateFilters((current) => ({
                  ...current,
                  q: event.target.value,
                }))
              }
              placeholder="Title or topic"
            />
          </label>
          <label className="space-y-2 block">
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
              value={filters.category}
              onChange={(event) =>
                updateFilters((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
            >
              <option value="">All categories</option>
              {catalogOptions.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 block">
            <Label htmlFor="level">Level</Label>
            <Select
              id="level"
              value={filters.level}
              onChange={(event) =>
                updateFilters((current) => ({
                  ...current,
                  level: event.target.value,
                }))
              }
            >
              <option value="">All levels</option>
              {catalogOptions.levels.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
          </label>
          <label className="space-y-2 block">
            <Label htmlFor="sort">Sort</Label>
            <Select
              id="sort"
              value={filters.sort}
              onChange={(event) =>
                updateFilters((current) => ({
                  ...current,
                  sort: event.target.value,
                }))
              }
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title</option>
              <option value="price_asc">Price low-high</option>
              <option value="price_desc">Price high-low</option>
              <option value="rating">Rating</option>
            </Select>
          </label>
        </CardContent>
      </Card>
      {loading ? <LoadingState /> : null}
      {!loading ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(previewOnly ? courses.slice(0, visibleCount) : courses).map(
              (course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  href={`/courses/${getCourseRouteKey(course)}`}
                  actionLabel="view_course"
                />
              ),
            )}
          </section>
          {previewOnly && courses.length > visibleCount ? (
            <div className="mt-4">
              <Button asChild>
                <Link to="/courses">See all courses</Link>
              </Button>
            </div>
          ) : null}
        </>
      ) : null}
      {!loading && courses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No courses found.</p>
      ) : null}
    </section>
  );
}
