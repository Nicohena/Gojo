import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";
import Modal from "../ui/Modal";
import LoadingSpinner from "../ui/LoadingSpinner";
import { sanitizeString, isValidEmail, isValidPhone } from "../../utils/validators";
import logger from "../../utils/logger";
import { User, Mail, Phone, ShieldCheck } from "lucide-react";

const CORAL = "#E67E5F";

const inputCls = (hasError) =>
  `w-full px-4 py-2.5 pl-10 rounded-lg border text-sm text-gray-800 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:border-transparent transition ${
    hasError ? "border-red-400 focus:ring-red-200" : "border-gray-200 focus:ring-[#E67E5F]/30"
  }`;

const labelCls = "block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5";

const UserEditModal = ({ isOpen, onClose, user, onUserUpdated }) => {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", role: "tenant" });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || "", email: user.email || "", phone: user.phone || "", role: user.role || "tenant" });
      setErrors({});
    }
  }, [user]);

  const validateForm = () => {
    const e = {};
    if (!formData.name || formData.name.trim().length < 2) e.name = "Full name is required.";
    if (!formData.email || !isValidEmail(formData.email)) e.email = "Please enter a valid email address.";
    if (formData.phone && !isValidPhone(formData.phone)) e.phone = "Invalid phone number format.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: name === "email" ? value : sanitizeString(value) }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) { toast.error("Please fix the highlighted errors."); return; }
    setIsSubmitting(true);
    try {
      const { default: adminService } = await import("../../api/adminService");
      const response = await adminService.updateUser(user._id, formData);
      const updatedUser = response?.data?.user || response?.user || response;
      toast.success("User updated successfully.");
      logger.info("User updated", { userId: user._id });
      onUserUpdated(updatedUser);
      onClose();
    } catch (err) {
      logger.error("Failed to update user", err);
      toast.error(err.response?.data?.message || "Failed to update user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit User" size="md" closeOnOverlayClick={!isSubmitting}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div>
          <label htmlFor="name" className={labelCls}>Full Name</label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" id="name" name="name" value={formData.name} onChange={handleChange}
              disabled={isSubmitting} placeholder="Full Name" className={inputCls(!!errors.name)} />
          </div>
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className={labelCls}>Email Address</label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="email" id="email" name="email" value={formData.email} onChange={handleChange}
              disabled={isSubmitting} placeholder="email@example.com" className={inputCls(!!errors.email)} />
          </div>
          {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className={labelCls}>Phone Number</label>
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange}
              disabled={isSubmitting} placeholder="+251 9xx xxx xxx" className={inputCls(!!errors.phone)} />
          </div>
          {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
        </div>

        {/* Role */}
        <div>
          <label htmlFor="role" className={labelCls}>Role</label>
          <div className="relative">
            <ShieldCheck size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
            <select id="role" name="role" value={formData.role} onChange={handleChange}
              disabled={isSubmitting}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#E67E5F]/30 focus:border-transparent appearance-none cursor-pointer disabled:opacity-50">
              <option value="tenant">Tenant</option>
              <option value="owner">Owner</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <p className="mt-1 text-xs text-gray-400">Changing the role will affect the user's platform access.</p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 mt-2">
          <button type="button" onClick={onClose} disabled={isSubmitting}
            className="px-5 py-2.5 border border-gray-200 text-sm font-semibold text-gray-600 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: CORAL }}>
            {isSubmitting ? <><LoadingSpinner size="sm" variant="white" /> Saving…</> : "Save Changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UserEditModal;
