import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { houseService } from "../../api/houseService";
import { getImageUrl } from "../../utils/imageUtils";
import toast from "react-hot-toast";
import {
  ChevronDown, MapPin, X, Wifi, Car, Wind,
  Coffee, Utensils, Dumbbell, Waves, Shield,
  ImagePlus, Check, ArrowLeft, Save,
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

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls = "w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition";
const labelCls = "block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5";

// ── Amenities (valid server enum values) ─────────────────────────────────────
const AMENITIES = [
  { label: "Wifi",             icon: Wifi,     value: "wifi" },
  { label: "Parking",          icon: Car,      value: "parking" },
  { label: "Air Conditioning", icon: Wind,     value: "ac" },
  { label: "Pool",             icon: Waves,    value: "pool" },
  { label: "Gym",              icon: Dumbbell, value: "gym" },
  { label: "Security",         icon: Shield,   value: "security" },
  { label: "Furnished",        icon: Coffee,   value: "furnished" },
  { label: "Balcony",          icon: Utensils, value: "balcony" },
];

// ── Counter ───────────────────────────────────────────────────────────────────
function Counter({ value, onChange, min = 0 }) {
  return (
    <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden w-fit">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
        className="px-3 py-2 text-gray-500 hover:bg-gray-50 font-bold text-lg leading-none">−</button>
      <span className="px-5 py-2 text-sm font-semibold text-gray-800 min-w-[3rem] text-center">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="px-3 py-2 text-gray-500 hover:bg-gray-50 font-bold text-lg leading-none">+</button>
    </div>
  );
}

// ── Map helpers ───────────────────────────────────────────────────────────────
const LocationMarker = ({ setPosition, onReverse }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      fetch(`${API_URL}/geocode/reverse?lat=${lat}&lon=${lng}`)
        .then(r => r.json())
        .then(data => {
          const addr = data.address || {};
          onReverse({
            address: data.display_name ? data.display_name.split(",")[0] : "",
            city: addr.city || addr.town || addr.village || "",
            state: addr.state || "",
          });
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

// ── Section card ──────────────────────────────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7 space-y-5">
      <div className="border-b border-gray-50 pb-4">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
const EditListing = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: "", description: "", propertyType: "apartment", price: "",
    bedrooms: 1, bathrooms: 1, size: 0, maxOccupants: 2,
    address: "", city: "", state: "", amenities: [], images: [],
  });

  const [mapCenter, setMapCenter] = useState([9.005401, 38.763611]);
  const [markerPos, setMarkerPos] = useState([9.005401, 38.763611]);

  const set = (key, value) => setFormData(p => ({ ...p, [key]: value }));

  // Load existing data
  useEffect(() => {
    const load = async () => {
      try {
        const res = await houseService.getHouseById(id);
        const house = res.data?.data?.house || res.data?.data || res.data;
        if (!house) throw new Error("Not found");

        setFormData({
          title: house.title || "",
          description: house.description || "",
          propertyType: house.propertyType || "apartment",
          price: house.price || "",
          bedrooms: house.rooms?.bedrooms ?? 1,
          bathrooms: house.rooms?.bathrooms ?? 1,
          size: house.size || 0,
          maxOccupants: house.rules?.maxOccupants ?? 2,
          address: house.location?.address || "",
          city: house.location?.city || "",
          state: house.location?.state || "",
          amenities: house.amenities || [],
          images: (house.images || []).map(img => img.url || img),
        });

        if (house.location?.coordinates?.coordinates?.length === 2) {
          const [lng, lat] = house.location.coordinates.coordinates;
          setMapCenter([lat, lng]);
          setMarkerPos([lat, lng]);
        }
      } catch (err) {
        toast.error("Failed to load listing.");
        navigate("/owner/listings");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const handleCityBlur = () => {
    if (!formData.city) return;
    const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
    fetch(`${API_URL}/geocode/search?q=${encodeURIComponent(formData.city)}`)
      .then(r => r.json())
      .then(d => {
        if (d?.[0]) {
          const c = [parseFloat(d[0].lat), parseFloat(d[0].lon)];
          setMapCenter(c);
          setMarkerPos(c);
        }
      }).catch(() => {});
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
    } catch { toast.error("Image upload failed."); }
    finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.title.trim()) { toast.error("Property title is required."); return; }
    if (!formData.price || Number(formData.price) <= 0) { toast.error("Please enter a valid price."); return; }

    setSaving(true);
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
        rules: { maxOccupants: Number(formData.maxOccupants) },
      };

      // Include coordinates only if moved
      if (markerPos[0] !== 9.005401 || markerPos[1] !== 38.763611) {
        payload.location.coordinates = {
          type: "Point",
          coordinates: [markerPos[1], markerPos[0]],
        };
      }

      if (formData.images.length > 0) {
        payload.images = formData.images.map((url, i) => ({
          url: typeof url === "string" ? url : url?.url || url,
          isPrimary: i === 0,
        }));
      }

      await houseService.updateHouse(id, payload);
      toast.success("Listing updated successfully.");
      navigate("/owner/listings");
    } catch (err) {
      const fieldErrors = err.response?.data?.data?.errors;
      if (fieldErrors?.length) {
        fieldErrors.forEach(e => toast.error(`${e.field}: ${e.message}`));
      } else {
        toast.error(err.response?.data?.message || "Failed to update listing.");
      }
    } finally { setSaving(false); }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: CORAL, borderTopColor: "transparent" }} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="py-8 px-4 md:px-8 max-w-4xl mx-auto w-full">
        {/* Heading */}
        <div className="flex items-center gap-3 mb-7">
          <button
            onClick={() => navigate("/owner/listings")}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft size={16} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Listing</h1>
            <p className="text-sm text-gray-500 mt-0.5">Update your property details.</p>
          </div>
        </div>

        <div className="space-y-5 mb-24">
          {/* ── Basics ───────────────────────────────────────────── */}
          <Section title="Basic Information" subtitle="Property title, description and type">
            <div>
              <label className={labelCls}>Property Title *</label>
              <input type="text" value={formData.title} onChange={e => set("title", e.target.value)}
                placeholder="e.g., Cozy Villa in Bole" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea value={formData.description} onChange={e => set("description", e.target.value)}
                placeholder="Describe the ambiance, neighborhood, and special features..."
                rows={4} className={`${inputCls} resize-none`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Property Type</label>
                <div className="relative">
                  <select value={formData.propertyType} onChange={e => set("propertyType", e.target.value)}
                    className={`${inputCls} appearance-none pr-10`}>
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="condo">Condo</option>
                    <option value="townhouse">Townhouse</option>
                    <option value="studio">Studio</option>
                    <option value="room">Room</option>
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Price (ETB / night) *</label>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                  <span className="px-3 py-2.5 bg-gray-50 text-xs font-bold text-gray-400 border-r border-gray-200">ETB</span>
                  <input type="number" value={formData.price} onChange={e => set("price", e.target.value)}
                    placeholder="3500" className="flex-1 px-3 py-2.5 text-sm text-gray-800 focus:outline-none" />
                </div>
              </div>
            </div>
          </Section>

          {/* ── Specs ────────────────────────────────────────────── */}
          <Section title="Property Specs" subtitle="Rooms, size and occupancy">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
              <div>
                <label className={labelCls}>Bedrooms</label>
                <Counter value={Number(formData.bedrooms)} onChange={v => set("bedrooms", v)} min={0} />
              </div>
              <div>
                <label className={labelCls}>Bathrooms</label>
                <Counter value={Number(formData.bathrooms)} onChange={v => set("bathrooms", v)} min={0} />
              </div>
              <div>
                <label className={labelCls}>Max Guests</label>
                <Counter value={Number(formData.maxOccupants)} onChange={v => set("maxOccupants", v)} min={1} />
              </div>
              <div>
                <label className={labelCls}>Size (sq ft)</label>
                <input type="number" value={formData.size} onChange={e => set("size", e.target.value)}
                  className={inputCls} placeholder="0" />
              </div>
            </div>
          </Section>

          {/* ── Location ─────────────────────────────────────────── */}
          <Section title="Location" subtitle="Address and map pin">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Street Address</label>
                  <input type="text" value={formData.address} onChange={e => set("address", e.target.value)}
                    placeholder="e.g. 123 Bole Road" className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>City</label>
                    <input type="text" value={formData.city} onChange={e => set("city", e.target.value)}
                      onBlur={handleCityBlur} placeholder="e.g. Addis Ababa" className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Region / State</label>
                    <input type="text" value={formData.state} onChange={e => set("state", e.target.value)}
                      placeholder="e.g. Oromia" className={inputCls} />
                  </div>
                </div>
              </div>
              <div className="relative rounded-2xl overflow-hidden border border-gray-200" style={{ height: 220 }}>
                <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%", zIndex: 0 }}>
                  <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={markerPos} />
                  <LocationMarker setPosition={setMarkerPos} onReverse={({ address, city, state }) => {
                    if (address) set("address", address);
                    if (city) set("city", city);
                    if (state) set("state", state);
                  }} />
                  <MapUpdater center={mapCenter} />
                </MapContainer>
                <button type="button"
                  onClick={() => {
                    navigator.geolocation?.getCurrentPosition(pos => {
                      const c = [pos.coords.latitude, pos.coords.longitude];
                      setMapCenter(c); setMarkerPos(c);
                    });
                  }}
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white border border-gray-200 shadow rounded-lg px-3 py-1.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-50 z-[999]">
                  <MapPin size={12} style={{ color: CORAL }} />
                  Use Current Location
                </button>
              </div>
            </div>
          </Section>

          {/* ── Amenities ────────────────────────────────────────── */}
          <Section title="Amenities" subtitle="Features available at the property">
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map(({ label, icon: Icon, value }) => {
                const selected = formData.amenities.includes(value);
                return (
                  <button key={value} type="button"
                    onClick={() => set("amenities", selected
                      ? formData.amenities.filter(a => a !== value)
                      : [...formData.amenities, value]
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
          </Section>

          {/* ── Photos ───────────────────────────────────────────── */}
          <Section title="Photos" subtitle="Upload or remove property images">
            {/* Existing images */}
            {formData.images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
                {formData.images.map((img, i) => (
                  <div key={i} className="relative rounded-xl overflow-hidden aspect-video bg-gray-100 group">
                    <img src={getImageUrl(img)} alt="" className="w-full h-full object-cover" />
                    {i === 0 && (
                      <div className="absolute top-2 left-2 bg-white/90 text-[10px] font-bold px-2 py-0.5 rounded-full text-gray-700">
                        Cover
                      </div>
                    )}
                    <button type="button"
                      onClick={() => set("images", formData.images.filter((_, idx) => idx !== i))}
                      className="absolute top-2 right-2 w-6 h-6 bg-white/90 rounded-full flex items-center justify-center text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload zone */}
            <div
              className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ borderColor: "#E67E5F55" }}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/"));
                if (files.length) handleUpload(files);
              }}
            >
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden"
                onChange={e => handleUpload(Array.from(e.target.files))} />
              <ImagePlus size={28} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">
                {uploading ? "Uploading..." : "Drag photos here or click to browse"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">JPG, PNG — max 800 KB each</p>
            </div>
          </Section>
        </div>

        {/* ── Sticky bottom bar ─────────────────────────────────── */}
        <div
          className="fixed bottom-0 right-0 bg-white border-t border-gray-100 flex items-center justify-between px-10 py-4 z-50"
          style={{ left: "13rem" }}
        >
          <button
            type="button"
            onClick={() => navigate("/owner/listings")}
            className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: CORAL }}
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default EditListing;
