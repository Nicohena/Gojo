import React, { useState, useEffect } from "react";
import "./AddListing.css";
import { DashboardLayout } from "../../components/layout/DashboardLayout";
import { houseService } from "../../api/houseService";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  MapPin,
  UploadCloud,
  X,
  Home,
  LayoutDashboard,
  Building2,
  CalendarCheck,
  MessageSquare,
  Wallet,
  Settings,
  MoreVertical,
} from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { getImageUrl } from "../../utils/imageUtils";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const LocationMarker = ({ position, setPosition, setFormData }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      fetch(`${API_URL}/geocode/reverse?lat=${lat}&lon=${lng}`)
        .then((res) => res.json())
        .then((data) => {
          const address = data.address || {};
          setFormData((prev) => ({
            ...prev,
            address: data.display_name
              ? data.display_name.split(",")[0]
              : prev.address,
            city: address.city || address.town || address.village || prev.city,
            state: address.state || prev.state,
            zip: address.postcode || prev.zip,
          }));
        })
        .catch((err) => console.error("Reverse geocoding failed", err));
    },
  });
  return position === null ? null : <Marker position={position}></Marker>;
};

const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13);
  }, [center, map]);
  return null;
};

const AddListing = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    propertyType: "Apartment",
    price: "",
    bedrooms: 2,
    bathrooms: 2,
    size: 1100,
    maxOccupants: 4,
    address: "",
    city: "Addis Ababa",
    state: "Addis Ababa",
    zip: "",
    amenities: [],
    images: [],
  });

  const [mapCenter, setMapCenter] = useState([9.005401, 38.763611]);
  const [markerPosition, setMarkerPosition] = useState([9.005401, 38.763611]);

  const amenitiesList = [
    "Wi-Fi",
    "Air Conditioning",
    "Swimming Pool",
    "Dishwasher",
    "Parking Spot",
    "Gym",
    "Pet Friendly",
    "Balcony",
    "Washer/Dryer",
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCityBlur = () => {
    if (formData.city) {
      const API_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      fetch(`${API_URL}/geocode/search?q=${encodeURIComponent(formData.city)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.length > 0) {
            const { lat, lon } = data[0];
            const newCenter = [parseFloat(lat), parseFloat(lon)];
            setMapCenter(newCenter);
            setMarkerPosition(newCenter);
          }
        })
        .catch((err) => console.error("Forward geocoding failed", err));
    }
  };

  const handleAmenityToggle = (amenity) => {
    setFormData((prev) => {
      const isSelected = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: isSelected
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
      };
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const uploadData = new FormData();
    files.forEach((file) => uploadData.append("images", file));
    try {
      setLoading(true);
      const response = await houseService.uploadImages(uploadData);
      const uploadedPaths = response.data.data || [];
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedPaths],
      }));
    } catch (error) {
      console.error("Image upload failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const amenityMapping = {
        "Wi-Fi": "wifi",
        "Air Conditioning": "ac",
        "Swimming Pool": "pool",
        Dishwasher: "dishwasher",
        "Parking Spot": "parking",
        Gym: "gym",
        "Pet Friendly": "pet-friendly",
        Balcony: "balcony",
        "Washer/Dryer": "laundry",
      };

      const payload = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        propertyType: formData.propertyType.toLowerCase(),
        rooms: {
          bedrooms: Number(formData.bedrooms),
          bathrooms: Number(formData.bathrooms),
          totalRooms: Number(formData.bedrooms) + 2,
        },
        size: Number(formData.size),
        amenities: formData.amenities.map(
          (a) => amenityMapping[a] || a.toLowerCase(),
        ),
        location: {
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip || "00000",
          country: "Ethiopia",
          coordinates: {
            type: "Point",
            coordinates: [markerPosition[1], markerPosition[0]],
          },
        },
        images: formData.images.map((url, index) => ({
          url,
          isPrimary: index === 0,
        })),
        available: true,
        rules: { maxOccupants: Number(formData.maxOccupants) },
      };

      await houseService.createHouse(payload);
      navigate("/owner/listings");
    } catch (error) {
      console.error("Failed to create listing:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.title) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-40">
           <div className="w-12 h-12 border-4 border-[#d4af37] border-t-transparent rounded-full animate-spin mb-6" />
           <span className="text-[#9a9a9a] uppercase tracking-widest text-xs font-bold font-serif">Initializing Secure Dossier...</span>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-10 px-4 mt-8">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(-1)}
              className="p-3 bg-[#111] border border-[#d4af37]/20 rounded-full hover:border-[#d4af37] transition-all"
            >
              <ArrowLeft size={18} className="text-[#d4af37]" />
            </button>
            <div>
              <h1 className="text-3xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Add New Estate
              </h1>
              <p className="text-[10px] text-[#9a9a9a] uppercase tracking-widest font-bold mt-1">Establishing Property Intelligence</p>
            </div>
          </div>
          <div className="hidden md:block text-[10px] text-[#d4af37]/50 font-bold uppercase tracking-widest bg-[#111] px-4 py-2 border border-[#d4af37]/10 rounded-full">Secure Entry Mode</div>
        </div>

        {/* Scrollable Form Area */}
        <div className="scroll-area mb-24">
          <div className="form-container">
            {/* General Info */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Core Intelligence</div>
                <div className="section-desc">Primary Identity and Financials</div>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="label">Estate Title</label>
                  <input
                    type="text"
                    name="title"
                    className="input-field"
                    placeholder="e.g. The Imperial Heights Loft"
                    value={formData.title}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="label">Dossier Narrative</label>
                  <textarea
                    name="description"
                    className="input-field"
                    placeholder="Provide a sophisticated narrative of the property's unique characteristics..."
                    value={formData.description}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Estate Type</label>
                  <div style={{ position: "relative" }}>
                    <select
                      name="propertyType"
                      className="input-field"
                      style={{ width: "100%", appearance: "none" }}
                      value={formData.propertyType}
                      onChange={handleInputChange}
                    >
                      <option value="Apartment">Apartment</option>
                      <option value="House">House</option>
                      <option value="Condo">Condo</option>
                      <option value="Townhouse">Townhouse</option>
                      <option value="Studio">Studio</option>
                      <option value="Room">Room</option>
                    </select>
                    <ChevronDown
                      style={{
                        position: "absolute",
                        right: "16px",
                        top: "16px",
                        pointerEvents: "none",
                        color: "#d4af37",
                      }}
                      size={16}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="label">Premium Rent (ETB)</label>
                  <input
                    type="number"
                    name="price"
                    className="input-field"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Property Specs */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Spatial Specifications</div>
                <div className="section-desc">Architecture and Capacity</div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="label">Suites (Bedrooms)</label>
                  <input
                    type="number"
                    name="bedrooms"
                    className="input-field"
                    value={formData.bedrooms}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Bathrooms</label>
                  <input
                    type="number"
                    name="bathrooms"
                    className="input-field"
                    value={formData.bathrooms}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Square Area</label>
                  <input
                    type="number"
                    name="size"
                    className="input-field"
                    value={formData.size}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Max Occupancy</label>
                  <input
                    type="number"
                    name="maxOccupants"
                    className="input-field"
                    value={formData.maxOccupants}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Geographic Coordinates</div>
                <div className="section-desc">Global Positioning</div>
              </div>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label className="label">Point of Interest (Address)</label>
                  <input
                    type="text"
                    name="address"
                    className="input-field"
                    placeholder="Enter precise street coordinates"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group">
                  <label className="label">City Hub</label>
                  <input
                    type="text"
                    name="city"
                    className="input-field"
                    value={formData.city}
                    onChange={handleInputChange}
                    onBlur={handleCityBlur}
                  />
                </div>
                <div className="form-group">
                  <label className="label">District / State</label>
                  <input
                    type="text"
                    name="state"
                    className="input-field"
                    value={formData.state}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="form-group full-width">
                  <label className="label">Digital Map Interface</label>
                  <div className="map-placeholder">
                    <MapContainer
                      center={mapCenter}
                      zoom={13}
                      style={{ height: "100%", width: "100%", zIndex: 0 }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={markerPosition} />
                      <LocationMarker
                        position={markerPosition}
                        setPosition={setMarkerPosition}
                        setFormData={setFormData}
                      />
                      <MapUpdater center={mapCenter} />
                    </MapContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Luxury Provisions</div>
                <div className="section-desc">Enhanced Living Experience</div>
              </div>
              <div className="amenities-grid">
                {amenitiesList.map((amenity) => (
                  <div
                    key={amenity}
                    className={`checkbox-group ${formData.amenities.includes(amenity) ? "checked" : ""}`}
                    onClick={() => handleAmenityToggle(amenity)}
                  >
                    <div className="checkbox-custom">
                      <Check size={14} />
                    </div>
                    <span style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", color: formData.amenities.includes(amenity) ? "#d4af37" : "#9a9a9a" }}>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">Visual Dossier</div>
                <div className="section-desc">Curation of Property Imagery</div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "20px",
                  marginBottom: "24px",
                }}
              >
                {formData.images.map((img, index) => (
                  <div
                    key={index}
                    style={{
                      aspectRatio: "1/1",
                      position: "relative",
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: "1px solid rgba(212, 175, 55, 0.2)"
                    }}
                  >
                    <img
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      src={getImageUrl(img)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "rgba(0, 0, 0, 0.8)",
                        width: "28px",
                        height: "28px",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#ef4444",
                        cursor: "pointer",
                        border: "1px solid rgba(255,255,255,0.1)"
                      }}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          images: prev.images.filter((_, i) => i !== index),
                        }));
                      }}
                    >
                      <X size={16} />
                    </div>
                    {index === 0 && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "8px",
                          left: "8px",
                          background: "#d4af37",
                          color: "#0a0a0a",
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "8px",
                          fontWeight: "900",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em"
                        }}
                      >
                        Primary
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div
                className="upload-area"
                onClick={() => document.getElementById("file-upload").click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleImageUpload}
                />
                <div className="upload-icon">
                  <UploadCloud size={24} />
                </div>
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "14px",
                    marginBottom: "8px",
                    color: "#f8f6f3",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em"
                  }}
                >
                  Encrypt New Imagery
                </div>
                <div
                  style={{ fontSize: "10px", color: "#9a9a9a", textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  Secure upload (Max 800KB per entity)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="actions-footer">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>Abort Dossier</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              "Publishing..."
            ) : (
              <>
                <Check size={16} />
                Commit Listing
              </>
            )}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AddListing;
