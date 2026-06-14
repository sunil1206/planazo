import Link from "next/link";
import type { Category } from "@/lib/marketplace/types";

export default function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
      {categories.map((c) => (
        <Link
          key={c.id}
          href={`/marketplace/products?category=${c.slug}`}
          className="group flex flex-col items-center text-center"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-stone-100 group-hover:bg-stone-200 transition flex items-center justify-center overflow-hidden">
            {c.icon_url ? (
              <img src={c.icon_url} alt={c.name} className="w-3/4 h-3/4 object-contain" />
            ) : (
              <span className="text-2xl">{"\u{1F381}"}</span>
            )}
          </div>
          <span className="mt-2 text-xs sm:text-sm text-stone-700 line-clamp-2">{c.name}</span>
        </Link>
      ))}
    </div>
  );
}
