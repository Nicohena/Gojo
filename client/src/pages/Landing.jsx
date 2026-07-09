import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRedirectPath } from "../utils/auth";
import {
  Search,
  Heart,
  Star,
  Bell,
  User,
  ChevronRight,
  Building2,
  Home,
  Landmark,
  Hotel,
  Waves,
  Mountain,
  ArrowUpDown,
} from "lucide-react";
import { houseService } from "../api/houseService";
import contactService from "../api/contactService";
import configService from "../api/configService";
import toast from "react-hot-toast";

// ─── Brand colors ────────────────────────────────────────────────────────────
const CORAL = "#E67E5F";
const BROWN = "#3D2C29";

// ─── Category pill data ───────────────────────────────────────────────────────
const CATEGORIES = [
  { label: "Apartments", icon: Building2, value: "apartment" },
  { label: "Villas", icon: Home, value: "villa" },
  { label: "Traditional", icon: Landmark, value: "traditional" },
  { label: "Guesthouses", icon: Hotel, value: "guesthouse" },
  { label: "Pools", icon: Waves, value: "pool" },
  { label: "Views", icon: Mountain, value: "views" },
];

// ─── Placeholder cards shown when backend has no data yet ────────────────────
const PLACEHOLDER_CARDS = [
  {
    id: "p1",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
    location: "Bole, Addis Ababa",
    title: "Modern Apartment",
    price: 3500,
    currency: "ETB",
    rating: 4.9,
    verified: false,
    images_count: 3,
  },
  {
    id: "p2",
    image:
      "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=600&q=80",
    location: "Hawassa, Sidama",
    title: "Lakeside Villa",
    price: 5200,
    currency: "ETB",
    rating: 4.8,
    verified: true,
    images_count: 4,
  },
  {
    id: "p3",
    image:
      "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=600&q=80",
    location: "Lalibela, Amhara",
    title: "Traditional Guesthouse",
    price: 1800,
    currency: "ETB",
    rating: 4.95,
    verified: false,
    images_count: 4,
  },
  {
    id: "p4",
    image:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80",
    location: "Kazanchis, Addis Ababa",
    title: "Executive Suite",
    price: 6000,
    currency: "ETB",
    rating: 5.0,
    verified: false,
    images_count: 2,
  },
];

// ─── ETB ↔ USD toggle ─────────────────────────────────────────────────────────
// Currency rate will be loaded from backend config

function formatPrice(etbPrice, showUsd, usdRate = 0.0174) {
  if (showUsd) {
    return `$${(etbPrice * usdRate).toFixed(0)}`;
  }
  return `${etbPrice.toLocaleString()} ETB`;
}

// ─── Property card ────────────────────────────────────────────────────────────
function PropertyCard({ card, showUsd, onCardClick, usdRate = 0.0174 }) {
  const [liked, setLiked] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const total = card.images_count || 1;

  return (
    <div
      className="cursor-pointer group flex-shrink-0 w-64"
      onClick={() => onCardClick(card.id)}
    >
      {/* Image */}
      <div className="relative rounded-2xl overflow-hidden h-48 bg-gray-100">
        <img
          src={card.image}
          alt={card.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Verified badge */}
        {card.verified && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: CORAL }}
            />
            Verified
          </div>
        )}

        {/* Heart */}
        <button
          className="absolute top-3 right-3 p-1.5"
          onClick={(e) => {
            e.stopPropagation();
            setLiked((v) => !v);
          }}
          aria-label="Save"
        >
          <Heart
            size={18}
            fill={liked ? CORAL : "none"}
            stroke={liked ? CORAL : "white"}
            strokeWidth={2}
          />
        </button>

        {/* Dot pagination */}
        {total > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
            {Array.from({ length: Math.min(total, 5) }).map((_, i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full transition-all"
                style={{
                  background: i === imgIdx ? "white" : "rgba(255,255,255,0.5)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 px-0.5">
        <div className="flex justify-between items-start">
          <p className="font-semibold text-gray-900 text-sm truncate">
            {card.location}
          </p>
          <div className="flex items-center gap-0.5 shrink-0 ml-2">
            <Star size={12} fill="#222" stroke="none" />
            <span className="text-xs font-medium text-gray-800">
              {card.rating}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">{card.title}</p>
        <p className="text-sm mt-1">
          <span className="font-semibold text-gray-900">
            {formatPrice(card.price, showUsd, usdRate)}
          </span>
          <span className="text-gray-500 font-normal"> night</span>
        </p>
      </div>
    </div>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [activeCategory, setActiveCategory] = useState("apartment");
  const [showUsd, setShowUsd] = useState(false);
  const [houses, setHouses] = useState([]);
  const [loadingHouses, setLoadingHouses] = useState(true);
  const [usdRate, setUsdRate] = useState(0.0174); // default fallback

  // Search state
  const [where, setWhere] = useState("");
  const [when, setWhen] = useState("");
  const [guests, setGuests] = useState("");

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate(getRedirectPath(user.role));
    }
  }, [user, authLoading, navigate]);

  // Load app configuration (currency rates, etc.)
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await configService.getConfig();
        if (config?.currency?.usdRate) {
          setUsdRate(config.currency.usdRate);
        }
      } catch (err) {
        console.error('Failed to load config:', err);
        // Use default rate
      }
    };
    loadConfig();
  }, []);

  // Fetch featured houses
  useEffect(() => {
    const load = async () => {
      try {
        setLoadingHouses(true);
        const res = await houseService.getHouses({
          limit: 8,
          sort: "-createdAt",
          status: "approved",
        });
        const data =
          res?.data?.data?.houses || res?.data?.houses || [];
        if (data.length > 0) {
          const mapped = data.map((h) => ({
            id: h._id,
            image:
              h.images?.[0]?.url ||
              h.images?.[0] ||
              "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80",
            location: `${h.location?.city || ""}, ${h.location?.state || h.location?.country || ""}`,
            title: h.title || h.type || "Rental",
            price: h.price || 0,
            currency: "ETB",
            rating: h.averageRating || h.rating || 4.5,
            verified: !!h.isVerified,
            images_count: h.images?.length || 1,
          }));
          setHouses(mapped);
        } else {
          setHouses(PLACEHOLDER_CARDS);
        }
      } catch {
        setHouses(PLACEHOLDER_CARDS);
      } finally {
        setLoadingHouses(false);
      }
    };
    load();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (where) params.set("location", where);
    if (when) params.set("date", when);
    if (guests) params.set("guests", guests);
    navigate(`/search?${params.toString()}`);
  };

  const displayedCards = loadingHouses ? PLACEHOLDER_CARDS : houses;

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* ── Navbar ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 shrink-0"
          >
            <GojoLogo />
            <span
              className="text-xl font-bold tracking-tight"
              style={{ color: CORAL }}
            >
              Gojo
            </span>
          </button>

          {/* Center search pill */}
          <nav className="hidden md:flex items-center bg-white border border-gray-200 rounded-full shadow-sm divide-x divide-gray-200 overflow-hidden">
            <button
              className="px-5 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors whitespace-nowrap"
              onClick={() => navigate("/search")}
            >
              Anywhere
            </button>
            <button className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">
              Any week
            </button>
            <button className="pl-5 pr-2 py-1.5 text-sm text-gray-400 hover:bg-gray-50 transition-colors flex items-center gap-3">
              <span>Add guests</span>
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                style={{ background: CORAL }}
              >
                <Search size={14} strokeWidth={2.5} />
              </span>
            </button>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate("/owner/dashboard")}
              className="hidden sm:block text-sm font-medium text-gray-700 hover:bg-gray-100 px-4 py-2 rounded-full transition-colors whitespace-nowrap"
            >
              Host your home
            </button>
            <button
              onClick={() => navigate("/notifications")}
              className="p-2.5 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </button>
            <button
              onClick={() => navigate("/login")}
              className="p-2.5 font-bold text-sm rounded-full transition-colors"
              style={{ color: CORAL }}
              aria-label="Sign in"
            >
              <User size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ height: 340 }}>
        <img
          src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80"
          alt="Ethiopian landscape"
          className="w-full h-full object-cover"
        />
        {/* Soft overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/25 to-black/50" />

        {/* Text + search */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white text-center leading-tight drop-shadow-lg">
            Discover Ethiopia's Best Stays
          </h1>
          <p className="mt-2 text-white/80 text-sm sm:text-base text-center max-w-md">
            From modern apartments in Addis Ababa to traditional villas in
            Lalibela.
          </p>

          {/* Search bar */}
          <div className="mt-6 w-full max-w-2xl bg-white rounded-full shadow-xl flex items-stretch overflow-hidden">
            <div className="flex-1 px-5 py-3 border-r border-gray-200">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Where
              </label>
              <input
                type="text"
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                placeholder="Search destinations"
                className="w-full text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none mt-0.5"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="flex-1 px-5 py-3 border-r border-gray-200 hidden sm:block">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                When
              </label>
              <input
                type="text"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                placeholder="Add dates"
                className="w-full text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none mt-0.5"
              />
            </div>
            <div className="flex-1 px-5 py-3 hidden md:block">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                Who
              </label>
              <input
                type="text"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                placeholder="Add guests"
                className="w-full text-sm text-gray-800 placeholder-gray-400 bg-transparent focus:outline-none mt-0.5"
              />
            </div>
            <button
              onClick={handleSearch}
              className="w-14 flex items-center justify-center rounded-full m-1.5 shrink-0 text-white transition-opacity hover:opacity-90"
              style={{ background: CORAL }}
              aria-label="Search"
            >
              <Search size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Category filters ──────────────────────────────────────────────── */}
      <div className="sticky top-16 z-40 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-6 overflow-x-auto py-3 scrollbar-hide no-scrollbar">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const active = activeCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className="flex flex-col items-center gap-1 min-w-fit pb-1 transition-all"
                  style={{
                    borderBottom: active ? `2px solid ${CORAL}` : "2px solid transparent",
                    color: active ? CORAL : "#6B6B6B",
                  }}
                >
                  <Icon size={22} strokeWidth={1.5} />
                  <span className="text-xs font-medium whitespace-nowrap">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Recommended for You ───────────────────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Section header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">
            Recommended for You
          </h2>
          {/* Currency toggle */}
          <button
            onClick={() => setShowUsd((v) => !v)}
            className="flex items-center gap-1.5 border border-gray-300 rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <span className={!showUsd ? "text-gray-900" : "text-gray-400"}>
              ETB
            </span>
            <ArrowUpDown size={12} className="text-gray-400" />
            <span className={showUsd ? "text-gray-900" : "text-gray-400"}>
              USD
            </span>
          </button>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {displayedCards.map((card) => (
            <PropertyCard
              key={card.id}
              card={card}
              showUsd={showUsd}
              onCardClick={(id) => navigate(`/details/${id}`)}
              usdRate={usdRate}
            />
          ))}
        </div>

        {/* Show more */}
        <div className="flex justify-center mt-8">
          <button
            onClick={() => navigate("/search")}
            className="border border-gray-300 rounded-full px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Show more
          </button>
        </div>
      </main>

      {/* ── Become a Host CTA ─────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden mx-4 sm:mx-6 max-w-7xl lg:mx-auto rounded-3xl mb-10"
        style={{ minHeight: 220 }}
      >
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80"
          alt="Modern kitchen"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-blue-800/60 to-transparent" />

        {/* Content */}
        <div className="relative z-10 p-8 sm:p-12 max-w-md">
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug">
            Earn money doing
            <br />
            what you love.
          </h2>
          <p className="mt-3 text-white/80 text-sm leading-relaxed">
            Host your space on Gojo and connect with guests from around the
            world.
          </p>
          <button
            onClick={() => navigate("/owner/dashboard")}
            className="mt-5 inline-block px-6 py-2.5 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: CORAL }}
          >
            Become a Host
          </button>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Brand */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5"
          >
            <GojoLogo size={20} />
            <span
              className="text-lg font-bold tracking-tight"
              style={{ color: CORAL }}
            >
              Gojo
            </span>
          </button>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-gray-600">
            <a href="#support" className="hover:text-gray-900 transition-colors">
              Support
            </a>
            <a href="#community" className="hover:text-gray-900 transition-colors">
              Community
            </a>
            <button
              onClick={() => navigate("/owner/dashboard")}
              className="hover:text-gray-900 transition-colors"
            >
              Hosting
            </button>
            <a href="#about" className="hover:text-gray-900 transition-colors">
              About
            </a>
          </nav>

          {/* Copyright */}
          <p className="text-xs text-gray-400 text-center">
            © 2024 Gojo Inc. · Supports Chapa &amp; Stripe
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Gojo logo SVG (house icon matching the uploaded logo) ───────────────────
function GojoLogo({ size = 28 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Roof (dark brown) */}
      <polygon points="50,10 95,48 5,48" fill={BROWN} />
      {/* House body (coral) */}
      <rect x="18" y="44" width="64" height="46" fill={CORAL} />
      {/* Door (white) */}
      <rect x="38" y="62" width="24" height="28" rx="2" fill="white" />
    </svg>
  );
}
