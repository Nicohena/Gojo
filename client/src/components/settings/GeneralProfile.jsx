import React, { useState, useRef, useEffect } from "react";
import { Camera, X, User, Mail, Phone, FileText } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import userService from "../../api/userService";
import toast from "react-hot-toast";
import { getImageUrl } from "../../utils/imageUtils";

const inputCls = "w-full bg-[#0a0a0a] border border-[#d4af37]/10 text-[#f8f6f3] px-4 py-3 text-sm focus:outline-none focus:border-[#d4af37]/40 placeholder-[#9a9a9a]/20 transition-all";
const labelCls = "text-[10px] uppercase font-bold text-[#d4af37]/50 tracking-widest mb-2 block";

const GeneralProfile = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
  });

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (user && !isInitialized) {
      setFormData({
        firstName: user.name?.split(" ")[0] || "",
        lastName: user.name?.split(" ").slice(1).join(" ") || "",
        email: user.email || "",
        phone: user.phone || "",
        bio: user.bio || "",
      });
      if (user.avatar) {
        setAvatarPreview(getImageUrl(user.avatar));
      }
      setIsInitialized(true);
    }
  }, [user, isInitialized]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarClick = () => { fileInputRef.current?.click(); };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800 * 1024) { toast.error("Image size must be less than 800KB"); return; }
      if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => { setAvatarPreview(reader.result); };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setLoading(true);
      await userService.removeAvatar();
      setAvatarPreview(null);
      setAvatarFile(null);
      toast.success("Avatar removed");
      setUser({ ...user, avatar: null });
    } catch (error) { toast.error("Failed to remove avatar"); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.firstName.trim()) { toast.error("First name is required"); return; }

    try {
      setLoading(true);
      if (avatarFile) {
        const avatarFormData = new FormData();
        avatarFormData.append("avatar", avatarFile);
        await userService.uploadAvatar(avatarFormData);
      }
      const updateData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone,
        bio: formData.bio,
      };
      const userId = user?.id || user?._id;
      if (!userId) { toast.error("User ID missing."); return; }
      const response = await userService.updateUser(userId, updateData);
      const updatedUser = response.data?.user || response.user || (response.success ? response.data || response : null);
      if (updatedUser) {
        setUser((prev) => ({ ...prev, ...updatedUser }));
        toast.success("Profile updated");
      }
      setAvatarFile(null);
    } catch (error) { toast.error("Failed to update profile"); } finally { setLoading(false); }
  };

  const getInitials = () => {
    if (formData.firstName && formData.lastName) return `${formData.firstName[0]}${formData.lastName[0]}`.toUpperCase();
    return user?.name?.[0]?.toUpperCase() || "U";
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="mb-10">
        <h2 className="text-3xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>Profile Information</h2>
        <p className="text-sm text-[#9a9a9a] mt-2 tracking-wide">Manage your public profile and contact details.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        {/* Avatar Section */}
        <div className="flex flex-col md:flex-row items-center gap-8 p-8 bg-[#111] border border-[#d4af37]/10 rounded-xl">
          <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
            <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-[#d4af37]/30 group-hover:border-[#d4af37] transition-all duration-500 shadow-2xl">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#0a0a0a] flex items-center justify-center text-4xl text-[#d4af37] font-bold italic" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {getInitials()}
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-[#0a0a0a]/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
              <Camera className="w-8 h-8 text-[#d4af37]" />
            </div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <h4 className="text-[#f8f6f3] font-bold mb-1">Profile Picture</h4>
            <p className="text-xs text-[#9a9a9a] mb-4 uppercase tracking-widest">JPG, GIF OR PNG. MAX SIZE 800KB</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <button type="button" onClick={handleAvatarClick} className="px-6 py-2 bg-[#d4af37] text-[#0a0a0a] text-[10px] font-bold uppercase tracking-widest hover:bg-[#b8941f] transition-all">Upload New</button>
              {avatarPreview && (
                <button type="button" onClick={handleRemoveAvatar} disabled={loading} className="px-6 py-2 border border-red-500/30 text-red-400 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500/10 transition-all">Remove</button>
              )}
            </div>
          </div>
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif" onChange={handleAvatarChange} className="hidden" />
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label htmlFor="firstName" className={labelCls}>First Name</label>
            <div className="relative">
              <User size={14} className="absolute left-4 top-4 text-[#d4af37]/40" />
              <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} className={`${inputCls} pl-11`} required />
            </div>
          </div>
          <div>
            <label htmlFor="lastName" className={labelCls}>Last Name</label>
            <div className="relative">
              <User size={14} className="absolute left-4 top-4 text-[#d4af37]/40" />
              <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} className={`${inputCls} pl-11`} />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label htmlFor="email" className={labelCls}>Email</label>
            <div className="relative">
              <Mail size={14} className="absolute left-4 top-4 text-[#d4af37]/40" />
              <input type="email" id="email" name="email" value={formData.email} className={`${inputCls} pl-11 opacity-50 cursor-not-allowed`} disabled />
            </div>
          </div>
          <div>
            <label htmlFor="phone" className={labelCls}>Phone Number</label>
            <div className="relative">
              <Phone size={14} className="absolute left-4 top-4 text-[#d4af37]/40" />
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleInputChange} className={`${inputCls} pl-11`} placeholder="+251 --- --- ---" />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className={labelCls}>Bio</label>
          <div className="relative">
            <FileText size={14} className="absolute left-4 top-4 text-[#d4af37]/40" />
            <textarea id="bio" name="bio" value={formData.bio} onChange={handleInputChange} className={`${inputCls} pl-11 h-32 resize-none`} placeholder="Describe your background and requirements..." maxLength={500} />
          </div>
          <p className="text-[10px] text-[#9a9a9a] mt-2 text-right tracking-widest uppercase font-bold">{formData.bio.length} / 500 CHARACTERS</p>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button type="submit" disabled={loading} className="px-10 py-3 bg-[#d4af37] text-[#0a0a0a] text-xs font-bold uppercase tracking-widest hover:bg-[#b8941f] shadow-2xl transition-all disabled:opacity-50">
            {loading ? "Applying Changes..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default GeneralProfile;
