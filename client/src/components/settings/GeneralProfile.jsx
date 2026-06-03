import React, { useState, useRef, useEffect } from "react";
import { User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";
import toast from "react-hot-toast";
import { getImageUrl } from "../../utils/imageUtils";

const CORAL = "#E67E5F";

const inputCls =
  "w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition bg-white";
const labelCls = "block text-sm font-medium text-gray-700 mb-1";

const GeneralProfile = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);
  const [initialized, setInitialized] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
  });

  useEffect(() => {
    if (user && !initialized) {
      setFormData({
        firstName: user.name?.split(" ")[0] || "",
        lastName: user.name?.split(" ").slice(1).join(" ") || "",
        email: user.email || "",
        phone: user.phone || "",
        bio: user.bio || "",
      });
      if (user.avatar) setAvatarPreview(getImageUrl(user.avatar));
      setInitialized(true);
    }
  }, [user, initialized]);

  const set = (key) => (e) => setFormData((p) => ({ ...p, [key]: e.target.value }));

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) { toast.error("Image must be under 800 KB"); return; }
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    try {
      setLoading(true);
      await userService.removeAvatar();
      setAvatarPreview(null);
      setAvatarFile(null);
      setUser({ ...user, avatar: null });
      toast.success("Avatar removed");
    } catch { toast.error("Failed to remove avatar"); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim()) { toast.error("First name is required"); return; }
    try {
      setLoading(true);
      if (avatarFile) {
        const fd = new FormData();
        fd.append("avatar", avatarFile);
        await userService.uploadAvatar(fd);
      }
      const userId = user?.id || user?._id;
      if (!userId) { toast.error("User ID missing"); return; }
      const res = await userService.updateUser(userId, {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone,
        bio: formData.bio,
      });
      const updated = res.data?.user || res.user || (res.success ? res.data || res : null);
      if (updated) setUser((p) => ({ ...p, ...updated }));
      setAvatarFile(null);
      toast.success("Profile updated");
    } catch { toast.error("Failed to update profile"); } finally { setLoading(false); }
  };

  const initials =
    formData.firstName && formData.lastName
      ? `${formData.firstName[0]}${formData.lastName[0]}`.toUpperCase()
      : user?.name?.[0]?.toUpperCase() || "U";

  return (
    <div>
      {/* Section heading */}
      <div className="flex items-center gap-2 mb-6">
        <User size={18} style={{ color: CORAL }} />
        <h2 className="text-lg font-bold text-gray-900">Profile Information</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Avatar row */}
        <div className="flex items-start gap-5 mb-2">
          {/* Avatar */}
          <div className="shrink-0">
            <div
              className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-200 cursor-pointer relative group bg-gray-100"
              onClick={() => fileInputRef.current?.click()}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-2xl font-bold text-gray-400">
                  {initials}
                </span>
              )}
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                <span className="text-white text-xs font-medium">Change</span>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 text-xs font-semibold hover:underline block text-center"
              style={{ color: CORAL }}
            >
              Change Photo
            </button>
            {avatarPreview && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="mt-0.5 text-xs text-gray-400 hover:text-red-500 transition-colors block text-center w-full"
              >
                Remove
              </button>
            )}
          </div>

          {/* Name + email */}
          <div className="flex-1 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First Name</label>
                <input type="text" required value={formData.firstName} onChange={set("firstName")} placeholder="Jane" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input type="text" value={formData.lastName} onChange={set("lastName")} placeholder="Doe" className={inputCls} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email Address</label>
              <input type="email" value={formData.email} disabled className={`${inputCls} bg-gray-50 cursor-not-allowed text-gray-400`} />
            </div>
          </div>
        </div>

        {/* Phone + Bio */}
        <div>
          <label className={labelCls}>Phone Number</label>
          <input type="tel" value={formData.phone} onChange={set("phone")} placeholder="+251 911 234 567" className={inputCls} />
        </div>

        {/* Save */}
        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: CORAL }}
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeneralProfile;
