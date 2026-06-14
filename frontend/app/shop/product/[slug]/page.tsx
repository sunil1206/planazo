"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { giftApi } from "@/lib/api";
import { ShoppingCart, Star, ChevronLeft, Package, Shield, Truck, MessageCircle } from "lucide-react";

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(s => (
        <button key={s} onClick={() => onChange(s)}
          onMouseEnter={() => setHover(s)} onMouseLeave={() => setHover(0)}>
          <Star size={24} fill={(hover || value) >= s ? "#F59E0B" : "none"}
            className={(hover || value) >= s ? "text-amber-400" : "text-gray-300"} />
        </button>
      ))}
    </div>
  );
}

export default function ProductDetailPage() {
  const { slug }           = useParams() as { slug: string };
  const [product, setProduct]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [activeImg, setActiveImg] = useState<string | null>(null);
  const [variant, setVariant]   = useState<any>(null);
  const [qty, setQty]           = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [reviewForm, setReviewForm]   = useState({ rating: 0, title: "", comment: "", reviewer_name: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewDone, setReviewDone]   = useState(false);

  useEffect(() => {
    giftApi.getProduct(slug)
      .then((d: any) => { setProduct(d); setActiveImg(d.image); setLoading(false); })
      .catch(() => setLoading(false));
  }, [slug]);

  const addToCart = async () => {
    try {
      await giftApi.cartAdd({
        product_id: product.id,
        variant_id: variant?.id || null,
        quantity:   qty,
      });
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2500);
    } catch {}
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.rating) return;
    setSubmittingReview(true);
    try {
      await giftApi.addReview(product.id, reviewForm);
      setReviewDone(true);
    } catch {}
    setSubmittingReview(false);
  };

  const API = process.env.NEXT_PUBLIC_API_URL || "";
  const imgUrl = (path: string | null) => path ? `${API}${path}` : null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[#8B1A4A] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="text-5xl">🔍</div>
      <p className="text-gray-500">Product not found</p>
      <Link href="/shop" className="text-[#8B1A4A] hover:underline">← Back to Shop</Link>
    </div>
  );

  const galleryImages = [
    ...(product.image ? [product.image] : []),
    ...(product.images || []).map((i: any) => i.image),
  ];

  const effectivePrice = variant?.effective_price ?? product.price;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <Link href="/shop" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
            <ChevronLeft size={16} /> Shop
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-700 line-clamp-1">{product.name}</span>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
          {/* ── Images ── */}
          <div>
            <div className="aspect-square rounded-2xl overflow-hidden bg-white border border-gray-100 mb-3">
              {activeImg
                ? <img src={imgUrl(activeImg)!} alt={product.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-7xl">🎁</div>}
            </div>
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {galleryImages.map((img: string, i: number) => (
                  <button key={i} onClick={() => setActiveImg(img)}
                    className={`w-16 h-16 rounded-lg overflow-hidden border-2 shrink-0 ${activeImg === img ? "border-[#8B1A4A]" : "border-transparent"}`}>
                    <img src={imgUrl(img)!} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── Details ── */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-400">{product.category_emoji} {product.category_name}</span>
              {product.seller_name && <span className="text-xs text-gray-400">· by {product.seller_name}</span>}
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">{product.name}</h1>

            {/* Rating */}
            {product.avg_rating && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={16} fill={s <= Math.round(product.avg_rating) ? "#F59E0B" : "none"}
                      className={s <= Math.round(product.avg_rating) ? "text-amber-400" : "text-gray-300"} />
                  ))}
                </div>
                <span className="text-sm font-medium text-gray-700">{product.avg_rating}</span>
                <span className="text-sm text-gray-400">({product.review_count} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-end gap-3 mb-5">
              <span className="text-3xl font-bold text-gray-900">
                ₹{parseFloat(effectivePrice).toLocaleString("en-IN")}
              </span>
              {product.compare_price && (
                <span className="text-lg text-gray-400 line-through">
                  ₹{parseFloat(product.compare_price).toLocaleString("en-IN")}
                </span>
              )}
              {product.discount_pct > 0 && (
                <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">
                  {product.discount_pct}% OFF
                </span>
              )}
            </div>

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div className="mb-5">
                <p className="text-sm font-medium text-gray-700 mb-2">Select Option:</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.filter((v: any) => v.is_active).map((v: any) => (
                    <button key={v.id}
                      onClick={() => setVariant(variant?.id === v.id ? null : v)}
                      disabled={v.stock === 0}
                      className={`px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                        variant?.id === v.id
                          ? "border-[#8B1A4A] bg-[#8B1A4A] text-white"
                          : v.stock === 0
                          ? "border-gray-200 text-gray-300 line-through cursor-not-allowed"
                          : "border-gray-200 text-gray-700 hover:border-[#8B1A4A]"
                      }`}>
                      {v.name}
                      {v.price && ` (+₹${(parseFloat(v.effective_price) - parseFloat(product.price)).toLocaleString("en-IN")})`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-3 mb-5">
              <span className="text-sm font-medium text-gray-700">Qty:</span>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-50">−</button>
                <span className="w-10 text-center text-sm font-medium">{qty}</span>
                <button onClick={() => setQty(Math.min(product.stock, qty + 1))}
                  className="w-10 h-10 flex items-center justify-center text-lg hover:bg-gray-50">+</button>
              </div>
              <span className="text-xs text-gray-400">{product.stock} available</span>
            </div>

            {/* CTA */}
            <button onClick={addToCart} disabled={product.stock === 0}
              className="w-full py-3.5 rounded-2xl text-white font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              style={{ background: addedToCart ? "#16a34a" : "#8B1A4A" }}>
              <ShoppingCart size={18} />
              {addedToCart ? "Added to Cart! ✓" : product.stock === 0 ? "Out of Stock" : "Add to Cart"}
            </button>

            {/* Badges */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                { icon: Truck,   text: product.stock >= 500 ? "Free Delivery" : "Delivery ₹49" },
                { icon: Shield,  text: "Secure Payment" },
                { icon: Package, text: product.is_cod ? "COD Available" : "Prepaid Only" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-1 text-center p-2 rounded-xl bg-gray-50">
                  <Icon size={16} className="text-[#C9952A]" />
                  <span className="text-xs text-gray-500">{text}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <h3 className="font-semibold text-gray-800 mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{product.description}</p>
            </div>
          </div>
        </div>

        {/* ── Reviews ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-5 flex items-center gap-2">
            <MessageCircle size={20} className="text-[#8B1A4A]" /> Customer Reviews
          </h2>

          {/* Rating summary */}
          {product.avg_rating && (
            <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-xl">
              <div className="text-center">
                <div className="text-4xl font-bold text-gray-900">{product.avg_rating}</div>
                <div className="flex justify-center mt-1">
                  {[1,2,3,4,5].map(s => (
                    <Star key={s} size={14} fill={s <= Math.round(product.avg_rating) ? "#F59E0B" : "none"}
                      className={s <= Math.round(product.avg_rating) ? "text-amber-400" : "text-gray-300"} />
                  ))}
                </div>
                <div className="text-xs text-gray-400 mt-1">{product.review_count} reviews</div>
              </div>
            </div>
          )}

          {/* Review list */}
          <div className="space-y-4 mb-8">
            {product.reviews?.length === 0 && (
              <p className="text-gray-400 text-sm">No reviews yet. Be the first to review!</p>
            )}
            {product.reviews?.map((r: any) => (
              <div key={r.id} className="border-b border-gray-50 pb-4 last:border-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{r.reviewer_name || "Anonymous"}</span>
                    {r.is_verified_purchase && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">✓ Verified</span>
                    )}
                  </div>
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={12} fill={s <= r.rating ? "#F59E0B" : "none"}
                        className={s <= r.rating ? "text-amber-400" : "text-gray-300"} />
                    ))}
                  </div>
                </div>
                {r.title && <p className="text-sm font-medium text-gray-700 mb-1">{r.title}</p>}
                <p className="text-sm text-gray-500">{r.comment}</p>
              </div>
            ))}
          </div>

          {/* Write review */}
          {reviewDone ? (
            <div className="bg-green-50 text-green-700 rounded-xl p-4 text-sm font-medium">
              ✓ Thank you for your review! It's been submitted for approval.
            </div>
          ) : (
            <form onSubmit={submitReview} className="border border-gray-100 rounded-2xl p-5">
              <h3 className="font-medium text-gray-800 mb-4">Write a Review</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Your Rating *</label>
                  <StarRating value={reviewForm.rating} onChange={(v) => setReviewForm({ ...reviewForm, rating: v })} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Your Name</label>
                  <input value={reviewForm.reviewer_name}
                    onChange={(e) => setReviewForm({ ...reviewForm, reviewer_name: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Review Title</label>
                  <input value={reviewForm.title}
                    onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Your Review *</label>
                  <textarea rows={3} required value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none" />
                </div>
                <button type="submit" disabled={!reviewForm.rating || submittingReview}
                  className="px-6 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50"
                  style={{ background: "#8B1A4A" }}>
                  {submittingReview ? "Submitting…" : "Submit Review"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
