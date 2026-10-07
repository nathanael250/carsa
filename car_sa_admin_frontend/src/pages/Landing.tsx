import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import carsaLogo from "../assets/carsa.png";
import appStoreLogo from "../assets/mobappLogo/AppStore.png";
import googlePlayLogo from "../assets/mobappLogo/GooglePlay.png";

const BRAND = "#FEA14C";
const BRAND_RGB = "254,161,76";
const DARK = "#2F4858";
const DARK_RGB = "47,72,88";

const NAV_LINKS: string[] = [];
const FOOTER_SERVICES = [
  "Advanced Diagnostics",
  "Engine Repair",
  "Performance Tuning",
  "Fleet Maintenance",
];

const FOOTER_CONTACT = [
  { label: "Phone", value: "+250 787 836 784", href: "tel:+250787836784" },
  { label: "Email", value: "hello@autox.rw", href: "mailto:hello@autox.rw" },
  { label: "Hours", value: "Mon - Sat / 7:00 AM - 8:00 PM" },
];

const FOOTER_SOCIAL = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "WhatsApp", href: "https://wa.me/250787836784" },
];

const APP_DOWNLOADS = [
  {
    label: "Google Play",
    logo: googlePlayLogo,
    eyebrow: "Get it on",
    href: "https://play.google.com/store",
  },
  {
    label: "App Store",
    logo: appStoreLogo,
    eyebrow: "Download on the",
    href: "https://www.apple.com/app-store/",
  },
];

const WHY_USE_CARSER = [
  {
    id: "01",
    title: "Never Miss Service",
    copy: "Car owners get timely reminders for the next service, helping them stay ahead of maintenance and avoid unnecessary delays.",
  },
  {
    id: "02",
    title: "Clear Service History",
    copy: "Each recorded visit builds a reliable maintenance history that makes it easier to track what was done on the car.",
  },
  {
    id: "03",
    title: "Better Garage Tracking",
    copy: "Garage owners can keep customer, vehicle, and service information organized in one place for easier daily follow-up.",
  },
  {
    id: "04",
    title: "Stronger Customer Trust",
    copy: "Accurate records and consistent reminders help garages deliver a more reliable experience and keep customers returning.",
  },
];

const HOW_IT_WORKS = [
  {
    id: "01",
    title: "Connect your vehicle",
    copy: "Register your vehicle and connect with your garage to keep your car’s details in one place.",
  },
  {
    id: "02",
    title: "Record every service",
    copy: "Your garage records the work carried out, building a clear history with each service visit.",
  },
  {
    id: "03",
    title: "Stay road ready",
    copy: "Review your service history and keep track of upcoming maintenance with service reminders.",
  },
];

const FAQS = [
  {
    question: "Who is Carser for?",
    answer: "Carser brings car owners and garage owners together. Drivers can follow their vehicle’s maintenance, while garages can organize customer, vehicle, and service information.",
  },
  {
    question: "How do I get my vehicle registered?",
    answer: "Start by providing your vehicle details to your garage so your car can be added to its records. Keeping those details accurate helps each service visit stay linked to the right vehicle.",
  },
  {
    question: "Can I see my previous service history?",
    answer: "You can follow the service visits recorded for your vehicle in Carser. Your history grows as your garage adds service records; visits that have not been recorded will not appear automatically.",
  },
  {
    question: "How do service reminders work?",
    answer: "Service reminders help you keep track of upcoming maintenance based on the next service information recorded for your vehicle. Ask your garage to keep that information up to date after each visit.",
  },
  {
    question: "Can garage owners use Carser too?",
    answer: "Yes. Garage accounts help teams keep customer details, vehicles, service records, and follow-up information organized in one place.",
  },
];

function SocialIcon({ label }: { label: string }) {
  switch (label) {
    case "Instagram":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" />
        </svg>
      );
    case "Facebook":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M13.2 20V12.8H15.9L16.3 9.8H13.2V7.9C13.2 7 13.5 6.4 14.8 6.4H16.4V3.7C16.1 3.7 15.2 3.6 14.1 3.6C11.8 3.6 10.2 5 10.2 7.7V9.8H7.5V12.8H10.2V20H13.2Z"
            fill="currentColor"
          />
        </svg>
      );
    case "WhatsApp":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12.1 4.2C8 4.2 4.7 7.5 4.7 11.5C4.7 13 5.2 14.5 6.1 15.7L5.1 19.2L8.7 18.3C9.8 19 11 19.4 12.3 19.4C16.4 19.4 19.7 16.1 19.7 12.1C19.6 7.9 16.2 4.2 12.1 4.2Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.4 8.9C9.1 9 8.8 9.4 8.7 9.7C8.5 10.2 8.5 11 9 11.9C9.7 13.2 11 14.4 12.4 15.1C13.2 15.5 14 15.5 14.5 15.3C14.8 15.2 15.1 14.9 15.2 14.6L15.4 13.8C15.4 13.7 15.3 13.5 15.1 13.4L13.5 12.7C13.3 12.6 13.2 12.6 13.1 12.8L12.6 13.4C12.5 13.5 12.3 13.6 12.1 13.5C11.4 13.2 10.5 12.4 10.1 11.6C10 11.5 10 11.3 10.2 11.2L10.7 10.7C10.8 10.5 10.9 10.4 10.8 10.2L10.2 8.9C10.1 8.8 9.8 8.7 9.4 8.9Z"
            fill="currentColor"
          />
        </svg>
      );
    default:
      return null;
  }
}

export default function HeroSection() {
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);


  return (
    <>
      {/* ── NAVBAR ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled
            ? "rgba(255,255,255,0.92)"
            : "rgba(255,255,255,0.0)",
          backdropFilter: scrolled ? "blur(14px)" : "none",
          borderBottom: scrolled ? `1px solid rgba(${BRAND_RGB},0.15)` : "1px solid transparent",
          boxShadow: scrolled ? `0 4px 24px rgba(${BRAND_RGB},0.08)` : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16 md:h-20">

          {/* Logo */}
          <Link
            to="/"
            className="inline-flex items-center"
            aria-label="Go to homepage"
            style={{
              background: `linear-gradient(135deg, ${BRAND}, #FE8A21)`,
              padding: "0.45rem 0.8rem",
              borderRadius: "4px",
              boxShadow: `0 8px 20px rgba(${BRAND_RGB},0.28)`,
              border: "1px solid rgba(255,255,255,0.65)",
            }}
          >
            <img
              src={carsaLogo}
              alt="CarSa"
              style={{
                height: 30,
                width: "auto",
                objectFit: "contain",
              }}
            />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm font-semibold uppercase tracking-wider relative group"
                style={{ fontFamily: "'Courier New', monospace", color: DARK, textDecoration: "none", letterSpacing: "0.1em" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = BRAND)}
                onMouseLeave={(e) => (e.currentTarget.style.color = DARK)}
              >
                {link}
                <span
                  className="absolute -bottom-0.5 left-0 w-0 h-px group-hover:w-full transition-all duration-300"
                  style={{ background: BRAND }}
                />
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="tel:+1234567890"
              className="flex items-center gap-2 text-sm font-semibold"
              style={{ fontFamily: "'Courier New', monospace", color: DARK, textDecoration: "none", letterSpacing: "0.05em" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={BRAND} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.77a16 16 0 0 0 6.29 6.29l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              +250 787 836 784
            </a>

            <Link
              to="/login"
              className="px-5 py-2.5 text-sm font-bold uppercase tracking-widest text-white"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Courier New', monospace",
                background: BRAND,
                clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)",
                transition: "all 0.3s ease",
                boxShadow: `0 3px 16px rgba(${BRAND_RGB},0.35)`,
                letterSpacing: "0.1em",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = BRAND;
                e.currentTarget.style.boxShadow = `0 5px 24px rgba(${BRAND_RGB},0.55)`;
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = BRAND;
                e.currentTarget.style.boxShadow = `0 3px 16px rgba(${BRAND_RGB},0.35)`;
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Login
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex flex-col gap-1.5 p-2"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="block h-0.5 transition-all duration-300"
                style={{
                  width: i === 1 ? (menuOpen ? "24px" : "16px") : "24px",
                  background: menuOpen ? BRAND : DARK,
                  transform:
                    menuOpen
                      ? i === 0
                        ? "rotate(45deg) translate(4px, 4px)"
                        : i === 2
                        ? "rotate(-45deg) translate(4px, -4px)"
                        : "opacity: 0"
                      : "none",
                  opacity: menuOpen && i === 1 ? 0 : 1,
                }}
              />
            ))}
          </button>
        </div>

        {/* Mobile menu */}
        <div
          className="md:hidden overflow-hidden transition-all duration-300"
          style={{
            maxHeight: menuOpen ? "320px" : "0px",
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(14px)",
            borderTop: menuOpen ? `1px solid rgba(${BRAND_RGB},0.12)` : "none",
          }}
        >
          <div className="px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm font-semibold uppercase tracking-wider py-1"
                style={{ fontFamily: "'Courier New', monospace", color: DARK, textDecoration: "none", letterSpacing: "0.12em" }}
                onClick={() => setMenuOpen(false)}
                onMouseEnter={(e) => (e.currentTarget.style.color = BRAND)}
                onMouseLeave={(e) => (e.currentTarget.style.color = DARK)}
              >
                {link}
              </a>
            ))}
            <button
              className="mt-2 py-3 text-sm font-bold uppercase tracking-widest text-white  cursor-pointer"
              style={{
                fontFamily: "'Courier New', monospace",
                background: BRAND,
                clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)",
                letterSpacing: "0.1em",
              }}
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ── */}
      <section className="relative w-full h-screen overflow-hidden bg-white flex items-center justify-center">
        {/* Hero content */}
        <div
          className="relative z-10 text-center px-6 flex flex-col items-center gap-6 mt-16"
          style={{ transform: `translateY(${-scrollY * 0.15}px)`, transition: "transform 0.05s linear" }}
        >
          {/* Eyebrow */}
          <div
            className="flex items-center gap-3 px-5 py-1.5 border text-xs uppercase"
            style={{
              borderColor: `rgba(${BRAND_RGB},0.4)`,
              color: BRAND,
              background: `rgba(${BRAND_RGB},0.06)`,
              fontFamily: "'Courier New', monospace",
              letterSpacing: "0.35em",
            }}
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BRAND }} />
            Premium Auto Services
            <span className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: BRAND, animationDelay: "0.5s" }} />
          </div>

          {/* Heading */}
          <h1
            className="text-6xl md:text-8xl font-black uppercase leading-none"
            style={{
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              color: DARK,
              letterSpacing: "-0.02em",
            }}
          >
            Drive{" "}
            <span style={{ color: BRAND }}>
              Beyond
            </span>
            <br />
            Limits
          </h1>

          {/* Subtext */}
          <p
            className="max-w-xl text-base md:text-lg leading-relaxed"
            style={{ color: `rgba(${DARK_RGB},0.72)`, fontFamily: "'Courier New', monospace", letterSpacing: "0.04em" }}
          >
            Expert diagnostics, elite repairs, and precision tuning — your vehicle deserves nothing less than perfection.
          </p>

          {/* App downloads */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
            {APP_DOWNLOADS.map((store) => {
              const isGoogle = store.label === "Google Play";

              return (
                <a
                  key={store.label}
                  href={store.href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-[255px] items-center gap-4 px-6 py-4 transition-all duration-300"
                  style={{
                    fontFamily: "'Courier New', monospace",
                    color: isGoogle ? DARK : BRAND,
                    background: isGoogle ? `rgba(${DARK_RGB},0.08)` : `rgba(${BRAND_RGB},0.08)`,
                    border: `1px solid ${isGoogle ? `rgba(${DARK_RGB},0.42)` : `rgba(${BRAND_RGB},0.42)`}`,
                    boxShadow: isGoogle
                      ? `0 10px 30px rgba(${DARK_RGB},0.08)`
                      : `0 10px 30px rgba(${BRAND_RGB},0.06)`,
                    clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
                    textDecoration: "none",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.background = isGoogle ? `rgba(${DARK_RGB},0.14)` : `rgba(${BRAND_RGB},0.14)`;
                    e.currentTarget.style.borderColor = isGoogle ? DARK : BRAND;
                    e.currentTarget.style.boxShadow = isGoogle
                      ? `0 14px 34px rgba(${DARK_RGB},0.14)`
                      : `0 14px 34px rgba(${BRAND_RGB},0.12)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = isGoogle ? `rgba(${DARK_RGB},0.08)` : `rgba(${BRAND_RGB},0.08)`;
                    e.currentTarget.style.borderColor = isGoogle ? `rgba(${DARK_RGB},0.42)` : `rgba(${BRAND_RGB},0.42)`;
                    e.currentTarget.style.boxShadow = isGoogle
                      ? `0 10px 30px rgba(${DARK_RGB},0.08)`
                      : `0 10px 30px rgba(${BRAND_RGB},0.06)`;
                  }}
                >
                  <img
                    src={store.logo}
                    alt=""
                    aria-hidden="true"
                    className="h-8 w-8 shrink-0 object-contain"
                  />
                  <div className="text-left">
                    <div
                      className="text-[11px] font-bold uppercase"
                      style={{
                        color: isGoogle ? `rgba(${DARK_RGB},0.85)` : `rgba(${BRAND_RGB},0.95)`,
                        letterSpacing: "0.2em",
                        lineHeight: 1.2,
                      }}
                    >
                      {store.eyebrow}
                    </div>
                    <div
                      className="text-xl font-black"
                      style={{
                        fontFamily: "'Georgia', 'Times New Roman', serif",
                        color: isGoogle ? DARK : BRAND,
                        letterSpacing: "0.01em",
                        lineHeight: 1.1,
                      }}
                    >
                      {store.label}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Stats */}
          <div
            className="flex gap-10 mt-6 pt-6"
            style={{ borderTop: `1px solid rgba(${BRAND_RGB},0.18)` }}
          >
            {[
              { value: "15K+", label: "Cars Serviced" },
              { value: "98%", label: "Satisfaction" },
              { value: "24/7", label: "Support" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div
                  className="text-2xl font-black"
                  style={{ color: BRAND, fontFamily: "'Impact', sans-serif", textShadow: `0 0 16px rgba(${BRAND_RGB},0.25)` }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-xs uppercase tracking-widest mt-0.5"
                  style={{ color: `rgba(${DARK_RGB},0.58)`, fontFamily: "'Courier New', monospace" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10"
          style={{ color: `rgba(${BRAND_RGB},0.55)` }}
        >
          <span className="text-xs uppercase tracking-[0.3em]" style={{ fontFamily: "'Courier New', monospace" }}>
            Scroll
          </span>
          <div
            className="w-px h-10 animate-pulse"
            style={{ background: `linear-gradient(to bottom, ${BRAND}, transparent)` }}
          />
        </div>
      </section>

      <section
        className="relative overflow-hidden py-24"
        style={{ background: "#ffffff" }}
      >
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="max-w-3xl">
            <div
              className="mb-4 inline-flex items-center gap-3 px-4 py-2 border text-xs font-bold uppercase"
              style={{
                borderColor: `rgba(${BRAND_RGB},0.24)`,
                background: `rgba(${BRAND_RGB},0.08)`,
                color: BRAND,
                fontFamily: "'Courier New', monospace",
                letterSpacing: "0.22em",
              }}
            >
              <span className="inline-block w-2 h-2 rounded-full" style={{ background: BRAND }} />
              Why Use Carser
            </div>

            

            <p
              className="mt-5 max-w-2xl text-base md:text-lg leading-relaxed"
              style={{
                fontFamily: "'Courier New', monospace",
                color: `rgba(${DARK_RGB},0.72)`,
                letterSpacing: "0.03em",
              }}
            >
              Carser helps car owners stay ready for the next service while giving garage owners a clear way to track vehicles, service records, and follow-up information.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {WHY_USE_CARSER.map((item) => (
              <div
                key={item.id}
                className="relative p-6 md:p-7"
                style={{
                  background: "rgba(255,255,255,0.86)",
                  border: `1px solid rgba(${BRAND_RGB},0.22)`,
                  boxShadow: `0 18px 45px rgba(${DARK_RGB},0.08)`,
                  clipPath: "polygon(14px 0%, 100% 0%, calc(100% - 14px) 100%, 0% 100%)",
                }}
              >
                <div
                  className="mb-5 text-xs font-bold uppercase"
                  style={{
                    fontFamily: "'Courier New', monospace",
                    color: BRAND,
                    letterSpacing: "0.24em",
                  }}
                >
                  {item.id}
                </div>

                <h3
                  className="text-[1.65rem] font-semibold leading-[1.15]"
                  style={{
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                    color: DARK,
                    letterSpacing: "-0.015em",
                  }}
                >
                  {item.title}
                </h3>

                <p
                  className="mt-4 text-sm leading-7"
                  style={{
                    fontFamily: "'Courier New', monospace",
                    color: `rgba(${DARK_RGB},0.74)`,
                  }}
                >
                  {item.copy}
                </p>

                <div
                  className="mt-6 h-px"
                  style={{ background: `linear-gradient(to right, rgba(${BRAND_RGB},0.45), transparent)` }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        aria-labelledby="how-it-works-heading"
        className="bg-white py-20 md:py-24"
        style={{ color: DARK, borderTop: `1px solid rgba(${DARK_RGB},0.12)` }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em]" style={{ fontFamily: "'Courier New', monospace" }}>
                <span aria-hidden="true" style={{ color: BRAND }}>— </span>How it works
              </p>
              <h2 id="how-it-works-heading" className="text-4xl md:text-5xl uppercase leading-tight" style={{ fontFamily: "'Impact', 'Arial Black', sans-serif" }}>
                A simple route to<br />better car care.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-7" style={{ fontFamily: "'Courier New', monospace", color: `rgba(${DARK_RGB},0.8)` }}>
              From your first visit to your next service, keep the important details together.
            </p>
          </div>

          <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8 list-none p-0">
            {HOW_IT_WORKS.map((step) => (
              <li key={step.id} className="pt-6" style={{ borderTop: `2px solid ${BRAND}` }}>
                <div className="mb-5 text-sm font-bold tracking-[0.18em]" style={{ color: BRAND, fontFamily: "'Courier New', monospace" }} aria-hidden="true">
                  {step.id}
                </div>
                <h3 className="text-2xl leading-tight" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>{step.title}</h3>
                <p className="mt-4 max-w-sm text-sm leading-7" style={{ fontFamily: "'Courier New', monospace", color: `rgba(${DARK_RGB},0.8)` }}>{step.copy}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section
        id="faq"
        aria-labelledby="faq-heading"
        className="bg-white py-20 md:py-24"
        style={{ color: DARK, borderTop: `1px solid rgba(${DARK_RGB},0.12)` }}
      >
        <style>{`
          #faq .faq-trigger:focus-visible { outline: 2px solid ${DARK}; outline-offset: 5px; }
          #faq .faq-trigger:hover .faq-question { text-decoration: underline; text-underline-offset: 5px; }
          #faq .faq-answer { display: grid; grid-template-rows: 0fr; opacity: 0; transition: grid-template-rows 280ms ease, opacity 220ms ease; }
          #faq .faq-answer[data-open="true"] { grid-template-rows: 1fr; opacity: 1; }
          #faq .faq-toggle { transition: transform 280ms ease; }
          #faq .faq-trigger[aria-expanded="true"] .faq-toggle { transform: rotate(180deg); }
          @media (prefers-reduced-motion: reduce) {
            #faq .faq-answer, #faq .faq-toggle { transition: none; }
          }
        `}</style>
        <div className="max-w-7xl mx-auto px-6 grid gap-12 lg:grid-cols-[1fr_1.6fr] lg:gap-20">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em]" style={{ fontFamily: "'Courier New', monospace" }}>
              <span aria-hidden="true" style={{ color: BRAND }}>— </span>FAQ
            </p>
            <h2 id="faq-heading" className="text-4xl md:text-5xl uppercase leading-tight" style={{ fontFamily: "'Impact', 'Arial Black', sans-serif" }}>
              Good questions.<br />Clear answers.
            </h2>
            <p className="mt-6 max-w-sm text-sm leading-7" style={{ fontFamily: "'Courier New', monospace", color: `rgba(${DARK_RGB},0.8)` }}>
              A few things to know about managing your vehicle’s care with Carser.
            </p>
          </div>
          <div style={{ borderTop: `1px solid rgba(${DARK_RGB},0.2)` }}>
            {FAQS.map((faq, index) => (
              <div key={faq.question} style={{ borderBottom: `1px solid rgba(${DARK_RGB},0.2)` }}>
                <h3>
                  <button
                    type="button"
                    id={`faq-question-${index}`}
                    aria-expanded={openFaq === index}
                    aria-controls={`faq-answer-${index}`}
                    onClick={() => setOpenFaq(openFaq === index ? null : index)}
                    className="faq-trigger flex w-full cursor-pointer items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className="faq-question text-lg md:text-xl leading-snug" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>{faq.question}</span>
                    <span className="faq-toggle text-2xl shrink-0 w-6 text-center" aria-hidden="true" style={{ color: DARK, fontFamily: "'Courier New', monospace" }}>{openFaq === index ? '−' : '+'}</span>
                  </button>
                </h3>
                <div
                  id={`faq-answer-${index}`}
                  role="region"
                  aria-labelledby={`faq-question-${index}`}
                  aria-hidden={openFaq !== index}
                  inert={openFaq !== index}
                  data-open={openFaq === index}
                  className="faq-answer"
                >
                  <div className="min-h-0 overflow-hidden">
                    <p className="pb-6 pr-4 md:pr-12 text-sm leading-7" style={{ fontFamily: "'Courier New', monospace", color: `rgba(${DARK_RGB},0.8)` }}>{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer
        className="relative overflow-hidden"
        style={{
          background: DARK,
        }}
      >
        <div className="relative max-w-7xl mx-auto px-6 py-10">
          {/* <div
            className="relative -mt-12 md:-mt-16 mb-14 p-8 md:p-10"
            style={{
              background: "rgba(255,255,255,0.96)",
              border: `1px solid rgba(${BRAND_RGB},0.28)`,
              boxShadow: `0 18px 60px rgba(${DARK_RGB},0.18)`,
              clipPath: "polygon(18px 0%, 100% 0%, calc(100% - 18px) 100%, 0% 100%)",
            }}
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="max-w-2xl">
                <div
                  className="mb-3 text-xs font-bold uppercase"
                  style={{
                    fontFamily: "'Courier New', monospace",
                    color: BRAND,
                    letterSpacing: "0.28em",
                  }}
                >
                  Stay Road Ready
                </div>
                <h2
                  className="text-3xl md:text-4xl font-black uppercase leading-tight"
                  style={{
                    fontFamily: "'Impact', 'Arial Black', sans-serif",
                    color: DARK,
                    letterSpacing: "-0.02em",
                  }}
                >
                  Built for drivers who expect precision every time.
                </h2>
              </div>

              <a
                href="tel:+250787836784"
                className="inline-flex items-center justify-center px-8 py-4 text-sm font-bold uppercase tracking-widest text-white"
                style={{
                  fontFamily: "'Courier New', monospace",
                  background: BRAND,
                  clipPath: "polygon(10px 0%, 100% 0%, calc(100% - 10px) 100%, 0% 100%)",
                  boxShadow: `0 10px 30px rgba(${BRAND_RGB},0.35)`,
                }}
              >
                Book Your Visit
              </a>
            </div>
          </div> */}

          <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <Link to="/" className="inline-flex items-center mb-5" aria-label="Go to homepage">
                <img
                  src={carsaLogo}
                  alt="CarSa"
                  style={{
                    height: 42,
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              </Link>

              <p
                className="max-w-md text-sm leading-7"
                style={{
                  fontFamily: "'Courier New', monospace",
                  color: "rgba(255,255,255,0.72)",
                  letterSpacing: "0.03em",
                }}
              >
                Diagnostics, repairs, detailing, and performance care designed for drivers who want confidence on every mile.
              </p>
            </div>

            <div>
              <h3
                className="mb-5 text-sm font-bold uppercase"
                style={{
                  fontFamily: "'Courier New', monospace",
                  color: BRAND,
                  letterSpacing: "0.22em",
                }}
              >
                Services
              </h3>
              <div className="space-y-3">
                {FOOTER_SERVICES.map((service) => (
                  <div
                    key={service}
                    className="text-sm"
                    style={{
                      fontFamily: "'Courier New', monospace",
                      color: "rgba(255,255,255,0.8)",
                    }}
                  >
                    {service}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3
                className="mb-5 text-sm font-bold uppercase"
                style={{
                  fontFamily: "'Courier New', monospace",
                  color: BRAND,
                  letterSpacing: "0.22em",
                }}
              >
                Contact
              </h3>
              <div className="space-y-4">
                {FOOTER_CONTACT.map((item) => (
                  <div key={item.label}>
                    <div
                      className="mb-1 text-[11px] font-bold uppercase"
                      style={{
                        fontFamily: "'Courier New', monospace",
                        color: `rgba(${BRAND_RGB},0.82)`,
                        letterSpacing: "0.18em",
                      }}
                    >
                      {item.label}
                    </div>
                    {item.href ? (
                      <a
                        href={item.href}
                        className="text-sm"
                        style={{
                          fontFamily: "'Courier New', monospace",
                          color: "#ffffff",
                          textDecoration: "none",
                        }}
                      >
                        {item.value}
                      </a>
                    ) : (
                      <div
                        className="text-sm"
                        style={{
                          fontFamily: "'Courier New', monospace",
                          color: "#ffffff",
                        }}
                      >
                        {item.value}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3
                className="mb-5 text-sm font-bold uppercase"
                style={{
                  fontFamily: "'Courier New', monospace",
                  color: BRAND,
                  letterSpacing: "0.22em",
                }}
              >
                Follow
              </h3>
              <div className="flex flex-wrap gap-4">
                {FOOTER_SOCIAL.map((channel) => (
                  <a
                    key={channel.label}
                    href={channel.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={channel.label}
                    className="flex h-12 w-12 items-center justify-center border transition-colors duration-300"
                    style={{
                      color: "#ffffff",
                      borderColor: "rgba(255,255,255,0.14)",
                      background: "rgba(255,255,255,0.03)",
                      clipPath: "polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = BRAND;
                      e.currentTarget.style.borderColor = `rgba(${BRAND_RGB},0.7)`;
                      e.currentTarget.style.background = `rgba(${BRAND_RGB},0.08)`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#ffffff";
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)";
                      e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    }}
                  >
                    <SocialIcon label={channel.label} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div
            className="mt-12 flex flex-col gap-4 border-t pt-6 text-xs uppercase md:flex-row md:items-center md:justify-between"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              fontFamily: "'Courier New', monospace",
              color: "rgba(255,255,255,0.62)",
              letterSpacing: "0.14em",
            }}
          >
            <div>© {currentYear} CarSa. All rights reserved.</div>
            <div className="flex gap-6">
              <span>Performance First</span>
              <span>Precision Always</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
