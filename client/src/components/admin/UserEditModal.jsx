import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import LoadingSpinner from "../ui/LoadingSpinner";
import {
  sanitizeString,
  isValidEmail,
  isValidPhone,
} from "../../utils/validators";
import logger from "../../utils/logger";
import { User, Mail, Phone, ShieldCheck, X } from "lucide-react";

/**
 * User Edit Modal Component
 * Modal for editing user details with form validation
 * Restyled for luxury dark theme.
 */

const UserEditModal = ({ isOpen, onClose, user, onUserUpdated }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "tenant",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "tenant",
      });
      setErrors({});
    }
  }, [user]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = "Full name required for record";
    }
    if (!formData.email || !isValidEmail(formData.email)) {
      newErrors.email = "Invalid secure communication channel (Email)";
    }
    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = "Invalid telecommunication format";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "email" ? value : sanitizeString(value),
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Protocol validation failed");
      return;
    }

    setIsSubmitting(true);
    try {
      const { default: adminService } = await import("../../api/adminService");
      const response = await adminService.updateUser(user._id, formData);
      const updatedUser = response?.data?.user || response?.user || response;

      toast.success("Intelligence updated successfully");
      logger.info("User details committed", { userId: user._id });

      onUserUpdated(updatedUser);
      onClose();
    } catch (err) {
      logger.error("Failed to commit user details", err);
      toast.error(err.response?.data?.message || "Secure update failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Intelligence Access"
      size="md"
      closeOnOverlayClick={!isSubmitting}
    >
      <form onSubmit={handleSubmit} className="p-2">
        <div className="space-y-6">
          {/* Name Field */}
          <div className="form-group">
            <label
              htmlFor="name"
              className="block text-[10px] font-black text-[#9a9a9a] uppercase tracking-widest mb-2"
            >
              Identity Alias (Full Name)
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]/40 group-hover:text-[#d4af37] transition-colors">
                <User size={18} />
              </div>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full bg-[#0a0a0a] border pl-12 pr-4 py-3 rounded-xl text-[#f8f6f3] outline-none transition-all ${
                  errors.name
                    ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                    : "border-[#d4af37]/10 focus:border-[#d4af37]/40"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>
            {errors.name && (
              <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-tighter">
                {errors.name}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div className="form-group">
            <label
              htmlFor="email"
              className="block text-[10px] font-black text-[#9a9a9a] uppercase tracking-widest mb-2"
            >
              Communication Vector (Email)
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]/40 group-hover:text-[#d4af37] transition-colors">
                <Mail size={18} />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full bg-[#0a0a0a] border pl-12 pr-4 py-3 rounded-xl text-[#f8f6f3] outline-none transition-all ${
                  errors.email
                    ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                    : "border-[#d4af37]/10 focus:border-[#d4af37]/40"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>
            {errors.email && (
              <p className="mt-2 text-[10px] font-bold text-red-500 uppercase tracking-tighter">
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone Field */}
          <div className="form-group">
            <label
              htmlFor="phone"
              className="block text-[10px] font-black text-[#9a9a9a] uppercase tracking-widest mb-2"
            >
              Contact Interface (Phone)
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]/40 group-hover:text-[#d4af37] transition-colors">
                <Phone size={18} />
              </div>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={isSubmitting}
                placeholder="+251..."
                className={`w-full bg-[#0a0a0a] border pl-12 pr-4 py-3 rounded-xl text-[#f8f6f3] outline-none transition-all ${
                  errors.phone
                    ? "border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
                    : "border-[#d4af37]/10 focus:border-[#d4af37]/40"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              />
            </div>
          </div>

          {/* Role Field */}
          <div className="form-group">
            <label
              htmlFor="role"
              className="block text-[10px] font-black text-[#9a9a9a] uppercase tracking-widest mb-2"
            >
              Clearance Level (Role)
            </label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#d4af37]/40 group-hover:text-[#d4af37] transition-colors z-10">
                <ShieldCheck size={18} />
              </div>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full bg-[#0a0a0a] border border-[#d4af37]/10 pl-12 pr-4 py-3 rounded-xl text-[#f8f6f3] outline-none transition-all focus:border-[#d4af37]/40 appearance-none disabled:opacity-50"
              >
                <option value="tenant">Tenant Clearance</option>
                <option value="owner">Owner Authorization</option>
                <option value="admin">Admin Intelligence</option>
              </select>
            </div>
            <p className="mt-2 text-[10px] text-[#d4af37]/60 font-medium uppercase tracking-[0.05em]">
              Altering clearance level will impact system accessibility
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-8 border-t border-[#d4af37]/10 mt-8">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-8 py-3 border border-[#d4af37]/10 text-[#9a9a9a] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-white/5 transition-all outline-none"
            >
              Abort Update
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-[#d4af37] text-[#0a0a0a] text-xs font-black uppercase tracking-widest rounded-xl hover:bg-[#b8941f] shadow-lg shadow-[#d4af37]/10 transition-all flex items-center justify-center gap-3 disabled:opacity-50 outline-none"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" variant="white" />
                  Updating...
                </>
              ) : (
                "Commit Changes"
              )}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default UserEditModal;
