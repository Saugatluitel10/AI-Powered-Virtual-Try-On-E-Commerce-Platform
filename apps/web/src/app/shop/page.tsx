"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { DEMO_PRODUCTS } from "@/data/demo-products";
import ProductCard from "@/components/catalog/ProductCard";

const categories = Array.from(new Set(DEMO_PRODUCTS.map((product) => product.garmentType).filter((value): value is string => Boolean(value))));
const colors = Array.from(new Set(DEMO_PRODUCTS.map((product) => product.color))).sort();
const styles = Array.from(new Set(DEMO_PRODUCTS.map((product) => product.style))).sort();
const sizes = ["XS", "S", "M", "L", "XL", "XXL", "28", "30", "32", "34", "36", "ONE_SIZE"];

export default function ShopPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [gender, setGender] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [style, setStyle] = useState("");
  const [maxPrice, setMaxPrice] = useState("15000");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const reset = () => { setQuery(""); setCategory(""); setGender(""); setColor(""); setSize(""); setStyle(""); setMaxPrice("15000"); };
  const products = useMemo(() => DEMO_PRODUCTS.filter((product) => {
    const text = `${product.name} ${product.brandName}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (!category || product.garmentType === category) && (!gender || product.gender === gender) && (!color || product.color === color) && (!size || product.sizes.includes(size)) && (!style || product.style === style) && product.price <= Number(maxPrice);
  }), [query, category, gender, color, size, style, maxPrice]);
  const active = [category, gender, color, size, style].filter(Boolean).length + (maxPrice !== "15000" ? 1 : 0);
  const controls = <div className="space-y-5">
    <Filter label="Category" value={category} setValue={setCategory} options={categories} />
    <Filter label="Gender" value={gender} setValue={setGender} options={["mens", "womens", "unisex"]} labels={{ mens: "Men", womens: "Women", unisex: "Unisex" }} />
    <Filter label="Color" value={color} setValue={setColor} options={colors} />
    <Filter label="Size" value={size} setValue={setSize} options={sizes} />
    <Filter label="Style" value={style} setValue={setStyle} options={styles} />
    <label className="block text-xs font-bold uppercase">Maximum price: Rs. {Number(maxPrice).toLocaleString()}<input type="range" min="1000" max="15000" step="500" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className="mt-3 w-full accent-[#b61f32]" /></label>
    <button onClick={reset} className="w-full border border-black px-4 py-3 text-xs font-bold uppercase">Reset filters</button>
  </div>;
  return <div className="mx-auto max-w-[1280px] px-4 py-10 sm:px-8">
    <div className="flex flex-col justify-between gap-5 border-b border-black pb-8 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase text-[#b61f32]">Local catalogue</p><h1 className="mt-2 font-display text-4xl sm:text-5xl">Find your next favourite.</h1></div><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-3 h-4 w-4" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clothing" className="h-10 w-full border border-black/30 bg-white pl-10 pr-3" /></div></div>
    <div className="mt-8 flex items-center justify-between"><p className="text-sm text-neutral-600">{products.length} products</p><button onClick={() => setFiltersOpen(!filtersOpen)} className="flex items-center gap-2 border border-black px-3 py-2 text-xs font-bold uppercase lg:hidden"><SlidersHorizontal className="h-4 w-4" /> Filters {active > 0 && `(${active})`}</button></div>
    {filtersOpen && <div className="mt-4 border border-black/10 bg-white p-5 lg:hidden"><button onClick={() => setFiltersOpen(false)} className="mb-4 ml-auto block"><X /></button>{controls}</div>}
    <div className="mt-6 grid gap-8 lg:grid-cols-[220px_1fr]"><aside className="hidden lg:block">{controls}</aside><div>{products.length ? <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">{products.map((product, index) => <ProductCard key={product.id} product={product} priority={index < 3} />)}</div> : <div className="border border-dashed border-black/30 px-6 py-20 text-center"><h2 className="font-display text-2xl">No pieces match those filters</h2><p className="mt-2 text-sm text-neutral-500">Clear one or more filters and try again.</p><button onClick={reset} className="mt-5 bg-black px-5 py-3 text-xs font-bold uppercase text-white">Clear filters</button></div>}</div></div>
  </div>;
}

function Filter({ label, value, setValue, options, labels = {} }: { label: string; value: string; setValue: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return <label className="block text-xs font-bold uppercase">{label}<select value={value} onChange={(event) => setValue(event.target.value)} className="mt-2 h-10 w-full border border-black/25 bg-white px-2 text-sm capitalize"><option value="">All</option>{options.map((option) => <option key={option} value={option}>{labels[option] ?? option.replace("ONE_SIZE", "One size")}</option>)}</select></label>;
}
