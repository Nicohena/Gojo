import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { houseService } from "../../api/houseService";
import { getImageUrl } from "../../utils/imageUtils";
import toast from "react-hot-toast";
import {
  Check, ChevronDown, MapPin, X, Wifi, Car, Wind,
  Coffee, Utensils, Dumbbell, Waves, Shield,
  ImagePlus, TrendingUp, Info, ArrowRight,
} from "lucide-react";
import {
  MapContainer, TileLayer, Marker, useMap, useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

const CORAL = "#E67E5F";
const BROWN = "#3D2C29";

// ── Shared field styles ───────────────────────────────────────────────────────
const inputCls = "w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition";
const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5";

// ── Stepper ───────────────────────────────────────────────────────────────────
const STEPS = ["Basics", "Location", "Photos", "Pricing"];

function Stepper({ current }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all"
                style={
                  done
                    ? { background: "#22C55E", borderColor: "#22C55E", color: "white" }
                    : active
                    ? { background: CORAL, borderColor: CORAL, color: "white" }
                    : { background: "white", borderColor: "#D1D5DB", color: "#9CA3AF" }
                }
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </div>
              <span
                className="text-[10px] font-bold uppercase tracking-widest mt-1"
                style={{ color: active ? CORAL : done ? "#22C55E" : "#9CA3AF" }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all"
                style={{ background: done ? "#22C55E" : i === current - 1 ? CORAL : "#E5E7EB" }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Counter input ─────────────────────────────────────────────────────────────
function Counter({ value, onChange, min = 0 }) {
  return (
    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="px-3 py-2 text-gray-500 hover:bg-gray-50 transition-colors font-bold text-lg leading-none">−</button>
      <span className="px-4 py-2 text-sm font-semibold text-gray-800 min-w-[3rem] text-center">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="px-3 py-2 text-gray-500 hover:bg-gray-50 transition-colors font-bold text-lg leading-none">+</button>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={onChange}
      className="relative w-12 h-6 rounded-full transition-colors"
      style={{ background: checked ? CORAL : "#D1D5DB" }}>
      <span className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
        style={{ transform: checked ? "translateX(24px)" : "translateX(0)" }} />
    </button>
  );
}

// ── Map helpers ───────────────────────────────────────────────────────────────
const LocationMarker = ({ setPosition, setFormData }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      fetch(`${API_URL}/geocode/reverse?lat=${lat}&lon=${lng}`)
        .then(r => r.json())
        .then(data => {
          const addr = data.address || {};
          setFormData(p => ({
            ...p,
            address: data.display_name ? data.display_name.split(",")[0] : p.address,
            city: addr.city || addr.town || addr.village || p.city,
            state: addr.state || p.state,
          }));
        }).catch(() => {});
    },
  });
  return null;
};

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 13); }, [center, map]);
  return null;
};

// ── Amenities list (values must match server enum exactly) ───────────────────
const AMENITIES = [
  { label: "Wifi",              icon: Wifi,     value: "wifi" },
  { label: "Parking",           icon: Car,      value: "parking" },
  { label: "Air Conditioning",  icon: Wind,     value: "ac" },
  { label: "Pool",              icon: Waves,    value: "pool" },
  { label: "Gym",               icon: Dumbbell, value: "gym" },
  { label: "Security",          icon: Shield,   value: "security" },
  { label: "Furnished",         icon: Coffee,   value: "furnished" },
  { label: "Balcony",           icon: Utensils, value: "balcony" },
];

// ── Step 1: Basics ────────────────────────────────────────────────────────────
function StepBasics({ data, set, errors = {} }) {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Tell us about your place</h2>
      <p className="text-sm text-gray-500 mb-6">Start by providing the basic details and category of your property.</p>

      <div className="space-y-5">
        {/* Title */}
        <div>
          <label className={labelCls}>Property Title *</label>
          <input type="text" value={data.title} onChange={e => set("title", e.target.value)}
            placeholder="e.g., Cozy Villa in Bole"
            className={`${inputCls} ${errors.title ? "border-red-400 ring-1 ring-red-300" : ""}`} />
          {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          <p className="text-xs text-gray-400 mt-1">Catch guests' attention with a listing title that highlights what makes your place special.</p>
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>Description *</label>
          <textarea value={data.description} onChange={e => set("description", e.target.value)}
            placeholder="Describe the ambiance, the neighborhood, and special features..."
            rows={5} className={`${inputCls} resize-none ${errors.description ? "border-red-400 ring-1 ring-red-300" : ""}`} />
          {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
        </div>

        {/* Type + counters */}
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Property Type *</label>
            <div className="relative max-w-xs">
              <select value={data.propertyType} onChange={e => set("propertyType", e.target.value)}
                className={`${inputCls} appearance-none pr-10 ${errors.propertyType ? "border-red-400 ring-1 ring-red-300" : ""}`}>
                <option value="">Select a type</option>
                <option value="apartment">Apartment</option>
                <option value="house">House</option>
                <option value="condo">Condo</option>
                <option value="townhouse">Townhouse</option>
                <option value="studio">Studio</option>
                <option value="room">Room</option>
              </select>
              <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            {errors.propertyType && <p className="text-xs text-red-500 mt-1">{errors.propertyType}</p>}
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className={labelCls}>Guests</label>
              <Counter value={data.maxOccupants} onChange={v => set("maxOccupants", v)} min={1} />
            </div>
            <div>
              <label className={labelCls}>Bedrooms</label>
              <Counter value={data.bedrooms} onChange={v => set("bedrooms", v)} min={0} />
            </div>
            <div>
              <label className={labelCls}>Baths</label>
              <Counter value={data.bathrooms} onChange={v => set("bathrooms", v)} min={0} />
            </div>
          </div>
        </div>

        {/* Amenities */}
        <div>
          <label className={labelCls}>Popular Amenities</label>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(({ label, icon: Icon, value }) => {
              const selected = data.amenities.includes(value);
              return (
                <button key={value} type="button"
                  onClick={() => set("amenities", selected
                    ? data.amenities.filter(a => a !== value)
                    : [...data.amenities, value]
                  )}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm border transition-all"
                  style={selected
                    ? { background: "#FEF0EC", color: CORAL, borderColor: CORAL }
                    : { background: "white", color: "#374151", borderColor: "#E5E7EB" }
                  }>
                  <Icon size={13} />
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Location ──────────────────────────────────────────────────────────
function StepLocation({ data, set, errors = {}, mapCenter, setMapCenter, markerPos, setMarkerPos }) {
  const handleCityBlur = () => {
    if (!data.city) return;
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    fetch(`${API_URL}/geocode/search?q=${encodeURIComponent(data.city)}`)
      .then(r => r.json())
      .then(d => {
        if (d?.[0]) {
          const c = [parseFloat(d[0].lat), parseFloat(d[0].lon)];
          setMapCenter(c);
          setMarkerPos(c);
        }
      }).catch(() => {});
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      const c = [pos.coords.latitude, pos.coords.longitude];
      setMapCenter(c);
      setMarkerPos(c);
    });
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Where's your place located?</h2>
      <p className="text-sm text-gray-500 mb-6">Your address is only shared with guests after they've made a booking.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Street Address</label>
            <input type="text" value={data.address} onChange={e => set("address", e.target.value)}
              placeholder="e.g. 123 Bole Road"
              className={`${inputCls} ${errors.address ? "border-red-400 ring-1 ring-red-300" : ""}`} />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>
          <div>
            <label className={labelCls}>Apartment, Suite, etc. (optional)</label>
            <input type="text" value={data.apartment || ""} onChange={e => set("apartment", e.target.value)}
              placeholder="e.g. Apt 4B" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>City</label>
              <input type="text" value={data.city} onChange={e => set("city", e.target.value)}
                onBlur={handleCityBlur} placeholder="e.g. Addis Ababa"
                className={`${inputCls} ${errors.city ? "border-red-400 ring-1 ring-red-300" : ""}`} />
              {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
            </div>
            <div>
              <label className={labelCls}>Region / State</label>
              <input type="text" value={data.state} onChange={e => set("state", e.target.value)}
                placeholder="e.g. Oromia"
                className={`${inputCls} ${errors.state ? "border-red-400 ring-1 ring-red-300" : ""}`} />
              {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="relative rounded-2xl overflow-hidden border border-gray-200" style={{ height: 260 }}>
          <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%", zIndex: 0 }}>
            <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker position={markerPos} />
            <LocationMarker setPosition={setMarkerPos} setFormData={fd => {
              set("address", fd.address || data.address);
              set("city", fd.city || data.city);
              set("state", fd.state || data.state);
            }} />
            <MapUpdater center={mapCenter} />
          </MapContainer>
          <button type="button" onClick={handleCurrentLocation}
            className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white border border-gray-200 shadow rounded-lg px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 z-[999] transition-colors">
            <MapPin size={12} style={{ color: CORAL }} />
            Use Current Location
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Photos ────────────────────────────────────────────────────────────
function StepPhotos({ images, onUpload, onRemove, uploading, errors = {} }) {
  const dropRef = useRef(null);
  const inputRef = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length) onUpload(files);
  };

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-1">Showcase your space</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-xl">
        Upload high-quality photos to give guests a clear idea of what to expect. Listings with beautiful, well-lit photos get significantly more bookings.
      </p>

      {/* Guidelines */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5 flex gap-3">
        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
          <span className="text-lg">💡</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-1">Photo Quality Guidelines</p>
          <ul className="text-xs text-gray-500 space-y-0.5">
            <li>• Use natural light whenever possible.</li>
            <li>• Ensure rooms are clean and clutter-free.</li>
            <li>• Upload at least 5 photos, including the living area, bedroom, and bathroom.</li>
            <li>• Landscape orientation works best. Minimum resolution: 1024×768px.</li>
          </ul>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
        className="border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer hover:bg-gray-50 transition-colors mb-6"
        style={{ borderColor: "#E67E5F55" }}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden"
          onChange={e => onUpload(Array.from(e.target.files))} />
        <ImagePlus size={32} className="mx-auto mb-3 text-gray-300" />
        <p className="text-base font-semibold text-gray-700">Drag your photos here</p>
        <p className="text-sm text-gray-400 mt-1 mb-4">Choose at least 5 photos. You can reorder them later.</p>
        <button type="button"
          className="px-5 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
          {uploading ? "Uploading..." : "Browse Files"}
        </button>
      </div>
      {errors.images && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-4">
          {errors.images}
        </p>
      )}

      {/* Uploaded grid */}
      {images.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-3">
            Uploaded Photos{" "}
            <span className="text-gray-400 font-normal">({images.length}/5 minimum)</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden aspect-video bg-gray-100 group">
                <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <div className="absolute top-2 left-2 bg-white/90 text-xs font-bold px-2 py-0.5 rounded-full text-gray-700">
                    Cover Photo
                  </div>
                )}
                <button type="button" onClick={() => onRemove(i)}
                  className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step 4: Pricing ───────────────────────────────────────────────────────────
function StepPricing({ data, set, errors = {} }) {
  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-900 mb-1">Set your pricing</h2>
      <p className="text-sm text-gray-500 mb-6">You can change this at any time. Start with a competitive price to attract your first guests.</p>

      <div className="space-y-4">
        {/* Base price */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-base font-semibold text-gray-800 mb-3">Base nightly price</p>
          <div className="flex items-center bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
            <span className="px-4 py-3 text-sm font-bold text-gray-400 bg-gray-100 border-r border-gray-200">ETB</span>
            <input type="number" value={data.price} onChange={e => set("price", e.target.value)}
              className={`flex-1 px-4 py-3 text-2xl font-semibold text-gray-800 bg-transparent focus:outline-none`}
              placeholder="3500" />
          </div>
          {errors.price && <p className="text-xs text-red-500 mt-2">{errors.price}</p>}
          <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
            <TrendingUp size={12} style={{ color: CORAL }} />
            Similar listings in your area charge between 3,000 ETB – 4,500 ETB.
          </div>
        </div>

        {/* Smart pricing */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-base font-semibold text-gray-800">Smart Pricing</p>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              Automatically adjust your nightly price based on demand, seasonality, and local events to maximize your earnings.
            </p>
          </div>
          <Toggle checked={data.smartPricing} onChange={() => set("smartPricing", !data.smartPricing)} />
        </div>

        {/* Discounts */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5">
          <p className="text-base font-semibold text-gray-800 mb-4">Discounts</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-0.5">Weekly discount</p>
              <p className="text-xs text-gray-400 mb-2">For stays of 7 nights or more.</p>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <input type="number" value={data.weeklyDiscount} onChange={e => set("weeklyDiscount", e.target.value)}
                  className="flex-1 px-3 py-2 text-sm focus:outline-none" placeholder="10" />
                <span className="px-3 py-2 bg-gray-50 text-sm text-gray-500 border-l border-gray-200">%</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-0.5">Monthly discount</p>
              <p className="text-xs text-gray-400 mb-2">For stays of 28 nights or more.</p>
              <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                <input type="number" value={data.monthlyDiscount} onChange={e => set("monthlyDiscount", e.target.value)}
                  className="flex-1 px-3 py-2 text-sm focus:outline-none" placeholder="20" />
                <span className="px-3 py-2 bg-gray-50 text-sm text-gray-500 border-l border-gray-200">%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Service fee note */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
          <Info size={16} className="text-blue-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-gray-700">Gojo Service Fees</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
              Gojo deducts a flat 3% service fee from each booking to cover payment processing, 24/7 host support, and platform maintenance. The price you set above is what guests will pay.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────
function validateStep(step, formData) {
  const errors = {};
  if (step === 0) {
    if (!formData.title.trim())        errors.title       = "Property title is required.";
    if (!formData.description.trim())  errors.description = "Description is required.";
    if (!formData.propertyType)        errors.propertyType= "Please select a property type.";
  }
  if (step === 1) {
    if (!formData.address.trim()) errors.address = "Street address is required.";
    if (!formData.city.trim())    errors.city    = "City is required.";
    if (!formData.state.trim())   errors.state   = "Region / State is required.";
  }
  if (step === 2) {
    if (formData.images.length < 1) errors.images = "Please upload at least 1 photo before continuing.";
  }
  if (step === 3) {
    if (!formData.price || Number(formData.price) <= 0)
      errors.price = "Please enter a valid nightly price.";
  }
  return errors;
}

// ── Main wizard ───────────────────────────────────────────────────────────────
const AddListing = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    title: "", description: "", propertyType: "", price: "",
    bedrooms: 1, bathrooms: 1, maxOccupants: 2, size: 0,
    address: "", apartment: "", city: "Addis Ababa", state: "Addis Ababa",
    amenities: [], images: [],
    smartPricing: true, weeklyDiscount: "10", monthlyDiscount: "20",
  });

  const [mapCenter, setMapCenter] = useState([9.005401, 38.763611]);
  const [markerPos, setMarkerPos] = useState([9.005401, 38.763611]);

  const handleNext = () => {
    const errors = validateStep(step, formData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    if (step < 3) setStep(s => s + 1);
    else handleSubmit();
  };

  const set = (key, value) => {
    setFormData(p => ({ ...p, [key]: value }));
    // Clear error for the field as soon as user edits it
    if (fieldErrors[key]) setFieldErrors(p => { const n = { ...p }; delete n[key]; return n; });
  };

  const handleUpload = async (files) => {
    if (!files.length) return;
    const fd = new FormData();
    files.forEach(f => fd.append("images", f));
    try {
      setUploading(true);
      const res = await houseService.uploadImages(fd);
      const paths = res.data?.data || [];
      set("images", [...formData.images, ...paths]);
    } catch { /* silent */ } finally { setUploading(false); }
  };

  const handleRemoveImage = (idx) => set("images", formData.images.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        propertyType: formData.propertyType,
        rooms: {
          bedrooms: Number(formData.bedrooms),
          bathrooms: Number(formData.bathrooms),
          totalRooms: Number(formData.bedrooms) + Number(formData.bathrooms),
        },
        size: Number(formData.size) || 0,
        amenities: formData.amenities,
        location: {
          address: formData.address || "",
          city: formData.city,
          state: formData.state,
          zip: "",
          country: "Ethiopia",
        },
        available: true,
        rules: { maxOccupants: Number(formData.maxOccupants) },
      };

      // Add coordinates only if the map was interacted with
      if (markerPos[0] !== 9.005401 || markerPos[1] !== 38.763611) {
        payload.location.coordinates = {
          type: "Point",
          coordinates: [markerPos[1], markerPos[0]], // [lng, lat]
        };
      }

      // Only include images if they were uploaded (must be Cloudinary URLs)
      if (formData.images.length > 0) {
        payload.images = formData.images.map((url, i) => ({
          url: typeof url === "string" ? url : url?.url || url,
          isPrimary: i === 0,
        }));
      }

      await houseService.createHouse(payload);
      navigate("/owner/listings");
    } catch (err) {
      const respData = err.response?.data;
      const fieldErrors = respData?.data?.errors;
      const msg = respData?.message || err.message;
      if (fieldErrors?.length) {
        // Show each field error clearly
        fieldErrors.forEach(e => toast.error(`${e.field}: ${e.message}`));
      } else {
        toast.error(msg || "Failed to create listing. Please try again.");
      }
      console.error("Create listing failed:", respData || err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const STEP_LABELS = ["Next: Location", "Next: Photos", "Next: Pricing", "Complete & Publish"];

  return (
    <DashboardLayout>
      <div className="py-8 px-4 md:px-8 max-w-4xl mx-auto w-full">
        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New Listing</h1>

        {/* Stepper */}
        <Stepper current={step} />

        {/* Step card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 mb-24">
          {step === 0 && <StepBasics data={formData} set={set} errors={fieldErrors} />}
          {step === 1 && (
            <StepLocation data={formData} set={set} errors={fieldErrors}
              mapCenter={mapCenter} setMapCenter={setMapCenter}
              markerPos={markerPos} setMarkerPos={setMarkerPos} />
          )}
          {step === 2 && (
            <StepPhotos images={formData.images} onUpload={handleUpload}
              onRemove={handleRemoveImage} uploading={uploading} errors={fieldErrors} />
          )}
          {step === 3 && <StepPricing data={formData} set={set} errors={fieldErrors} />}
        </div>

        {/* Bottom nav bar — offset left by sidebar width */}
        <div className="fixed bottom-0 right-0 bg-white border-t border-gray-100 flex items-center justify-between px-10 py-4 z-50"
          style={{ left: "13rem" }}>
          <button
            type="button"
            onClick={() => step === 0 ? navigate("/owner/listings") : setStep(s => s - 1)}            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>

          <button
            type="button"
            onClick={() => step < 3 ? handleNext() : handleNext()}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: CORAL }}
          >
            {submitting ? "Publishing..." : STEP_LABELS[step]}
            {step < 3 && <ArrowRight size={14} />}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddListing;
