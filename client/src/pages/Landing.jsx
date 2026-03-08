import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRedirectPath } from "../utils/auth";
import { Shield, Zap, Key, ArrowRight, Mail, Phone, MapPin, Clock } from 'lucide-react';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import { houseService } from "../api/houseService";
import contactService from "../api/contactService";
import toast from "react-hot-toast";
const ContactForm = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errors, setErrors] = useState({});
  const maxMessageLen = 2000;

  const isValidEmail = (v = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());

  const validate = () => {
    const e = {};
    const tName = String(name || "").trim();
    const tEmail = String(email || "").trim();
    const tMsg = String(message || "").trim();
    if (tName.length < 2) e.name = 'Please enter your full name.';
    if (!isValidEmail(tEmail)) e.email = 'Please enter a valid email address.';
    if (tMsg.length < 10) e.message = 'Message should be at least 10 characters.';
    if (tMsg.length > maxMessageLen) e.message = `Message must be under ${maxMessageLen} characters.`;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error('Please fix the highlighted errors.');
      return;
    }

    setIsSubmitting(true);
    try {
      await contactService.submitInquiry({ name: name.trim(), email: email.trim(), message: message.trim() });
      toast.success("Message sent — we'll get back to you soon.");
      setIsSent(true);
      setName("");
      setEmail("");
      setMessage("");
      setErrors({});
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to send message.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsSent(false);
    setErrors({});
    setName('');
    setEmail('');
    setMessage('');
  };

  if (isSent) {
    return (
      <div className="p-6 bg-emerald-900/5 border border-emerald-500/15 rounded">
        <p className="text-[#d4af37] font-bold">Message sent</p>
        <p className="text-[#f8f6f3] mt-2">Thank you — our team will respond to your inquiry shortly.</p>
        <div className="mt-4">
          <button onClick={resetForm} className="px-4 py-2 bg-[#d4af37] text-[#0a0a0a] font-bold">Send another</button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <div>
        <input
          aria-label="Full name"
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
          className={`w-full bg-[#0a0a0a] border px-4 py-3 text-[#f8f6f3] placeholder-[#9a9a9a]/50 focus:outline-none focus:border-[#d4af37]/50 ${errors.name ? 'border-red-500' : 'border-[#d4af37]/15'}`}
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
      </div>

      <div>
        <input
          aria-label="Email address"
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isSubmitting}
          className={`w-full bg-[#0a0a0a] border px-4 py-3 text-[#f8f6f3] placeholder-[#9a9a9a]/50 focus:outline-none focus:border-[#d4af37]/50 ${errors.email ? 'border-red-500' : 'border-[#d4af37]/15'}`}
        />
        {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <textarea
          aria-label="Message"
          rows={6}
          placeholder="Tell us what you're looking for..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={isSubmitting}
          maxLength={maxMessageLen}
          className={`w-full bg-[#0a0a0a] border px-4 py-3 text-[#f8f6f3] placeholder-[#9a9a9a]/50 focus:outline-none focus:border-[#d4af37]/50 resize-none ${errors.message ? 'border-red-500' : 'border-[#d4af37]/15'}`}
        />
        <div className="flex justify-between items-center">
          {errors.message ? <p className="text-red-400 text-xs mt-1">{errors.message}</p> : <div />}
          <p className={`text-xs mt-1 ${message.length > maxMessageLen * 0.9 ? 'text-red-400' : 'text-[#9a9a9a]'}`}>{message.length}/{maxMessageLen}</p>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-8 py-3 bg-[#d4af37] text-[#0a0a0a] text-sm font-bold tracking-[0.1em] hover:bg-[#b8941f] transition-all disabled:opacity-50"
        >
          {isSubmitting ? 'Sending...' : 'Send Message'}
        </button>
      </div>
    </form>
  );
};
export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [featuredHouses, setFeaturedHouses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(getRedirectPath(user.role));
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const response = await houseService.getHouses({ limit: 3, sort: '-createdAt' });
        // Support different API shapes (data.data.houses or data.houses)
        const houses = response?.data?.data?.houses || response?.data?.houses || [];
        console.debug('fetchFeatured response:', response?.data);
        setFeaturedHouses(Array.isArray(houses) ? houses : []);
      } catch (err) {
        console.error('Failed to fetch featured houses', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  useEffect(() => {
    const elements = document.querySelectorAll("[data-reveal]");
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
    );

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: Shield,
      title: 'Verified Properties',
      description: 'Every residence is physically inspected and verified for quality and security standards.',
    },
    {
      icon: Zap,
      title: 'Modern Amenities',
      description: 'Equipped with the latest in smart home technology, climate control, and security systems.',
    },
    {
      icon: Key,
      title: 'Premium Support',
      description: 'Dedicated support and property management services available for your peace of mind.',
    },
  ];

  // Map real data if available, otherwise fallback to the beautiful placeholders
  const properties = featuredHouses.length > 0 ? featuredHouses.map(house => ({
    id: house._id,
    image: house.images?.[0]?.url || house.images?.[0] || 'https://images.unsplash.com/photo-1728019192740-6370819df1c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBnbGFzcyUyMHZpbGxhJTIwZm9yZXN0JTIwYXJjaGl0ZWN0dXJlJTIwbHV4dXJ5fGVufDF8fHx8MTc3Mjg3NDIwOXww&ixlib=rb-4.1.0&q=80&w=1080',
    title: house.title,
    location: `${house.location?.city || ''}, ${house.location?.state || ''}`,
    price: `$${house.price} / mo`,
    beds: `${house.rooms?.bedrooms || 0} Beds`,
    sqft: `${house.size || 0} sq.ft.`,
    tag: house.matchScore ? `${house.matchScore}% Match` : 'Verified',
  })) : [
    {
      id: '1',
      image: 'https://images.unsplash.com/photo-1728019192740-6370819df1c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBnbGFzcyUyMHZpbGxhJTIwZm9yZXN0JTIwYXJjaGl0ZWN0dXJlJTIwbHV4dXJ5fGVufDF8fHx8MTc3Mjg3NDIwOXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      title: 'The Glass House',
      location: 'Aspen, CO',
      price: '$14,500 / mo',
      beds: '4 Beds',
      sqft: '6,200 sq.ft.',
      tag: 'Smart Home Enabled',
    },
    {
      id: '2',
      image: 'https://images.unsplash.com/photo-1768413292179-d958b344f1d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwY29uY3JldGUlMjBsb2Z0JTIwaW50ZXJpb3IlMjBsdXh1cnl8ZW58MXx8fHwxNzcyODc0MjEwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      title: 'Concrete Sanctuary',
      location: 'Los Angeles, CA',
      price: '$18,000 / mo',
      beds: '5 Beds',
      sqft: '7,800 sq.ft.',
      tag: 'Biometric Security',
    },
    {
      id: '3',
      image: 'https://images.unsplash.com/photo-1610394001485-a3eceff6a4d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBwZW50aG91c2UlMjBvY2VhbiUyMHZpZXclMjBhcmNoaXRlY3R1cmV8ZW58MXx8fHwxNzcyODc0MjExfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
      title: 'Ocean Vista',
      location: 'Malibu, CA',
      price: '$22,500 / mo',
      beds: '6 Beds',
      sqft: '9,400 sq.ft.',
      tag: 'Smart Glass Technology',
    },
  ];

  const sliderSettings = {
    dots: false,
    infinite: properties.length > 2,
    speed: 800,
    slidesToShow: Math.min(properties.length, 2.2),
    slidesToScroll: 1,
    arrows: false,
    autoplay: true,
    autoplaySpeed: 4000,
    pauseOnHover: true,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow: Math.min(properties.length, 1.5),
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#d4af37]/10">
        <div className="max-w-[1600px] mx-auto px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo-mark.svg" alt="Logo" className="w-8 h-8" />
            <div className="text-[#d4af37] tracking-[0.3em] text-xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              SMART RENT
            </div>
          </div>
          <div className="hidden md:flex items-center gap-12">
            <button onClick={() => navigate("/search")} className="text-[#f8f6f3] tracking-[0.1em] text-sm hover:text-[#d4af37] transition-colors">
              Explore Homes
            </button>
            <a href="#experience" className="text-[#f8f6f3] tracking-[0.1em] text-sm hover:text-[#d4af37] transition-colors">
              How it works
            </a>
            <a href="#contact" className="text-[#f8f6f3] tracking-[0.1em] text-sm hover:text-[#d4af37] transition-colors">
              Contact
            </a>
            <button onClick={() => navigate("/owner/dashboard")} className="text-[#f8f6f3] tracking-[0.1em] text-sm hover:text-[#d4af37] transition-colors">
             Landlords
            </button>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={() => navigate("/login")} className="text-[#9a9a9a] text-sm hover:text-[#f8f6f3] transition-colors">
              Sign In
            </button>
            <button onClick={() => navigate("/register")} className="px-6 py-2.5 border border-[#d4af37] text-[#d4af37] tracking-[0.05em] text-sm hover:bg-[#d4af37] hover:text-[#0a0a0a] transition-all">
            Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1762270988759-fc744dd443b9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1bHRyYSUyMG1vZGVybiUyMHBlbnRob3VzZSUyMHR3aWxpZ2h0JTIwY2l0eSUyMHNreWxpbmUlMjBsdXh1cnl8ZW58MXx8fHwxNzcyODc0MjA5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
            alt="Modern penthouse at twilight"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/60 via-[#0a0a0a]/40 to-[#0a0a0a]/80" />
        </div>
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-8">
          <h1 
            data-reveal
            className="reveal-on-scroll text-6xl md:text-7xl lg:text-8xl text-center text-[#f8f6f3] mb-6 tracking-tight leading-[1.1]"
            style={{ fontFamily: "'Playfair Display', serif", transitionDelay: "80ms" }}
          >
            Elevated Living.
            <br />
            Architecturally Perfect.
          </h1>
          <p data-reveal className="reveal-on-scroll text-lg md:text-xl text-[#9a9a9a] text-center max-w-2xl mb-12 tracking-wide" style={{ transitionDelay: "160ms" }}>
            Discover a curated collection of world-class smart residences, reserved for the discerning few.
          </p>
          <button data-reveal onClick={() => navigate("/search")} className="reveal-on-scroll px-10 py-4 border-2 border-[#d4af37] text-[#d4af37] tracking-[0.1em] text-sm hover:bg-[#d4af37] hover:text-[#0a0a0a] transition-all" style={{ transitionDelay: "240ms" }}>
            Explore the Collection
          </button>
        </div>
      
      </section>

      {/* Features Section */}
      <section id="experience" className="bg-[#0a0a0a] py-32 px-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
            <div data-reveal className="reveal-on-scroll">
              <h2 
                className="text-5xl md:text-6xl text-[#f8f6f3] mb-6 leading-[1.1]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                Uncompromising
                <br />
                Standards.
              </h2>
              <p className="text-[#9a9a9a] text-lg tracking-wide max-w-lg">
                Each property in our collection meets rigorous quality standards to ensure a comfortable and secure stay for our residents.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-8">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div 
                    key={index}
                    data-reveal
                    className="reveal-on-scroll border-l-2 border-[#d4af37]/30 pl-6 py-4 hover:border-[#d4af37] transition-colors"
                    style={{ transitionDelay: `${120 + index * 80}ms` }}
                  >
                    <div className="mb-4">
                      <Icon className="w-8 h-8 text-[#d4af37]" strokeWidth={1.5} />
                    </div>
                    <h3 
                      className="text-2xl text-[#f8f6f3] mb-3"
                      style={{ fontFamily: "'Playfair Display', serif" }}
                    >
                      {feature.title}
                    </h3>
                    <p className="text-[#9a9a9a] leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Property Carousel */}
      <section className="bg-[#0a0a0a] py-32 overflow-hidden">
        <div className="max-w-[1600px] mx-auto px-8 mb-16">
          <div className="flex items-end justify-between">
            <h2 
              data-reveal
              className="reveal-on-scroll text-5xl md:text-6xl text-[#f8f6f3]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Featured Properties
            </h2>
            <button 
              onClick={() => navigate("/search")} 
              className="hidden md:flex items-center gap-3 text-[#d4af37] text-sm tracking-[0.05em] hover:gap-5 transition-all group"
            >
              View All Residences
              <ArrowRight className="w-12 h-4 group-hover:translate-x-2 transition-transform" strokeWidth={1} />
            </button>
          </div>
        </div>
        
        {loading ? (
              <p className="text-[#9a9a9a] font-medium tracking-wide">
                Loading properties...
              </p>
        ) : (
          <div data-reveal className="reveal-on-scroll pl-8 md:pl-16 lg:pl-24">
            <Slider {...sliderSettings}>
              {properties.map((property, index) => (
                <div key={index} className="px-3">
                  <div className="group cursor-pointer">
                    <div className="relative h-[600px] overflow-hidden mb-6">
                      <img
                        src={property.image}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/60 to-transparent" />
                      <div className="absolute top-6 left-6">
                        <div className="px-4 py-2 border border-[#d4af37] bg-[#0a0a0a]/80 backdrop-blur-sm">
                          <span className="text-[#d4af37] text-xs tracking-[0.1em]">
                            {property.tag}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 
                        className="text-3xl text-[#f8f6f3] mb-2"
                        style={{ fontFamily: "'Playfair Display', serif" }}
                      >
                        {property.title} • {property.location}
                      </h3>
                      <div className="flex items-center gap-4 text-[#9a9a9a] text-sm">
                        <span>{property.price}</span>
                        <span>|</span>
                        <span>{property.beds}</span>
                        <span>|</span>
                        <span>{property.sqft}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Slider>
          </div>
        )}
      </section>

      {/* Owners CTA */}
      <section 
        id="owners"
        className="relative py-40 px-8 overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1616651283320-ee68a1113d94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwYnJ1c2hlZCUyMG1ldGFsJTIwdGV4dHVyZSUyMGx1eHVyeXxlbnwxfHx8fDE3NzI4NzQyMTF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-[#0a0a0a]/85" />
        <div data-reveal className="reveal-on-scroll relative z-10 max-w-4xl mx-auto text-center">
          <h2 
            className="text-5xl md:text-7xl text-[#f8f6f3] mb-8 leading-[1.1]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            List Your Property.
          </h2>
          <p className="text-xl text-[#9a9a9a] mb-12 max-w-2xl mx-auto leading-relaxed tracking-wide">
            Partner with us to showcase your property to a global audience. Simple listing process, maximum reach.
          </p>
          <button onClick={() => navigate("/owner/dashboard")} className="px-12 py-4 bg-[#d4af37] text-[#0a0a0a] tracking-[0.1em] hover:bg-[#b8941f] transition-all font-bold">
            Apply for Partnership
          </button>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="bg-[#0a0a0a] py-32 px-8 border-t border-[#d4af37]/10">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          <div data-reveal className="reveal-on-scroll">
            <p className="text-[#d4af37] uppercase tracking-[0.3em] text-[11px] font-bold mb-4">Contact</p>
            <h2 className="text-5xl md:text-6xl text-[#f8f6f3] mb-6 leading-[1.1]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Let's help you
              <br />
              find the right home.
            </h2>
            <p className="text-[#9a9a9a] text-lg max-w-xl leading-relaxed">
              Reach out to our concierge team for listings, onboarding, and landlord support.
            </p>
            <div className="mt-10 space-y-4">
              <a href="mailto:support@smartrent.com" className="flex items-center gap-4 text-[#f8f6f3] hover:text-[#d4af37] transition-colors">
                <Mail className="w-5 h-5 text-[#d4af37]" />
                support@smartrent.com
              </a>
              <a href="tel:+251911000000" className="flex items-center gap-4 text-[#f8f6f3] hover:text-[#d4af37] transition-colors">
                <Phone className="w-5 h-5 text-[#d4af37]" />
                +251 911 000 000
              </a>
              <div className="flex items-center gap-4 text-[#f8f6f3]">
                <MapPin className="w-5 h-5 text-[#d4af37]" />
                Addis Ababa, Ethiopia
              </div>
              <div className="flex items-center gap-4 text-[#9a9a9a]">
                <Clock className="w-5 h-5 text-[#d4af37]" />
                Mon - Sat, 8:00 AM - 8:00 PM
              </div>
            </div>
          </div>

          <div data-reveal className="reveal-on-scroll bg-[#111] border border-[#d4af37]/10 p-8 md:p-10 space-y-5">
            <h3 className="text-2xl text-[#f8f6f3]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Send an Inquiry
            </h3>
            <ContactForm />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0a0a] border-t border-[#d4af37]/10 py-12 px-8">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate("/")}
          >
            <img src="/logo-mark.svg" alt="Logo" className="w-6 h-6" />
            <div className="text-[#d4af37] tracking-[0.3em] text-lg" style={{ fontFamily: "'Playfair Display', serif" }}>
              SMART RENT
            </div>
          </div>
          <div className="text-[#9a9a9a] text-sm">
            © 2026 Smart Rental System.
          </div>
        </div>
      </footer>
    </div>
  );
}
