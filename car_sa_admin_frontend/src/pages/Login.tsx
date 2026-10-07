import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../services/api";
import { authUtils } from "../utils/auth";
import carsaLogo from "../assets/carsa.png";

const BRAND = "#FEA14C";
const BR = "254,161,76";
const REMEMBERED_EMAIL_KEY = "remembered_login_email";

type InputFieldProps = {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  children?: ReactNode;
  autoComplete?: string;
  disabled?: boolean;
};

const InputField = ({
  label,
  type,
  placeholder,
  value,
  onChange,
  children,
  autoComplete,
  disabled = false,
}: InputFieldProps) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "0.8125rem",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#2F4858",
          fontWeight: 700,
          transition: "color 0.2s ease",
        }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          type={type}
          className="placeholder:text-[#657580] placeholder:opacity-100"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoComplete={autoComplete}
          disabled={disabled}
          style={{
            width: "100%",
            padding: "0.9rem 1rem",
            background: "#ffffff",
            border: `1.5px solid ${focused ? BRAND : "#8996A0"}`,
            borderRadius: "2px",
            outline: "none",
            fontFamily: "'Courier New', monospace",
            fontSize: "0.88rem",
            color: "#2F4858",
            transition: "all 0.2s ease",
            boxShadow: focused ? "0 0 0 3px rgba(47,72,88,0.12)" : "none",
            boxSizing: "border-box",
            opacity: disabled ? 0.75 : 1,
          }}
        />
        {children}
      </div>
    </div>
  );
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const successMessage =
    (location.state as { successMessage?: string } | null)?.successMessage || null;

  useEffect(() => {
    const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRemember(true);
    }
  }, []);

  const persistRememberedEmail = (nextEmail: string) => {
    if (remember) {
      window.localStorage.setItem(REMEMBERED_EMAIL_KEY, nextEmail);
      return;
    }
    window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);

    try {
      // Start from a clean state to avoid stale tokens interfering with route guards.
      authUtils.removeToken();

      const response = await api.login(trimmedEmail, trimmedPassword);

      if (response.error) {
        setError(response.error);
        return;
      }

      const token = response.data?.token;
      const user = response.data?.user;
      const role = authUtils.normalizeRole(user?.role);

      if (!token || !user) {
        setError("Login response is incomplete. Please try again.");
        return;
      }

      if (role !== "super_admin" && role !== "garage_admin") {
        authUtils.removeToken();
        setError("This login page is only available for garage admins and super admins.");
        return;
      }

      authUtils.setToken(token);
      authUtils.setUser({
        id: user.id,
        role: user.role,
        email: user.email || trimmedEmail,
      });
      persistRememberedEmail(trimmedEmail);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row" style={{ background: "#ffffff" }}>
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden px-14 py-16 xl:px-16"
        style={{ background: "#2F4858" }}
      >
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                left: "-20%",
                right: "-20%",
                top: `${i * 16}%`,
                height: "1px",
                background: `rgba(${BR},${0.05 + i * 0.012})`,
                transform: `rotate(-${2.5 + i * 1.5}deg)`,
              }}
            />
          ))}
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "3px",
              background: `linear-gradient(to bottom, transparent, ${BRAND} 40%, ${BRAND} 60%, transparent)`,
              opacity: 0.5,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              width: "120px",
              height: "120px",
              background: `radial-gradient(circle at 0% 100%, rgba(${BR},0.15), transparent 70%)`,
            }}
          />
        </div>

        <Link to="/" className="relative z-10 inline-flex w-fit" aria-label="Go to homepage">
          <img
            src={carsaLogo}
            alt="CarSa"
            style={{
              height: 46,
              width: "auto",
              objectFit: "contain",
              cursor: "pointer",
            }}
          />
        </Link>

        <div className="relative z-10">
          <div
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: "0.875rem",
              letterSpacing: "0.18em",
              color: `rgba(${BR},0.96)`,
              textTransform: "uppercase",
              marginBottom: "1.25rem",
            }}
          >
            ● Garage Admin Access
          </div>
          <h2
            style={{
              fontFamily: "'Impact', 'Arial Black', sans-serif",
              fontSize: "clamp(2.8rem, 3.8vw, 4.2rem)",
              color: "#ffffff",
              lineHeight: 0.95,
              letterSpacing: "-0.02em",
              textTransform: "uppercase",
              marginBottom: "1.75rem",
            }}
          >
            TRACK
            <br />
            <span style={{ color: BRAND }}>YOUR</span>
            <br />
            GARAGE.
          </h2>
          <p
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: "0.94rem",
              color: "rgba(255,255,255,0.74)",
              lineHeight: 2,
              letterSpacing: "0.025em",
              maxWidth: 300,
            }}
          >
            Keep service records, customer details, and next-service reminders organized in one place.
          </p>
        </div>

        <div className="relative z-10 flex gap-8 pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {[["Live", "Garage Records"], ["Next", "Service Alerts"], ["Daily", "Follow-Up"]].map(([val, lbl]) => (
            <div key={lbl}>
              <div style={{ fontFamily: "'Impact', sans-serif", color: BRAND, fontSize: "1.6rem", lineHeight: 1 }}>{val}</div>
              <div style={{ fontFamily: "'Courier New', monospace", fontSize: "0.7rem", letterSpacing: "0.1em", color: "rgba(255,255,255,0.62)", textTransform: "uppercase", marginTop: "0.35rem" }}>{lbl}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 lg:w-1/2 flex items-center justify-center bg-white px-6 py-12 lg:px-14 xl:px-18">
        <div className="w-full max-w-[440px]">
          <Link to="/" className="flex lg:hidden items-center mb-10 w-fit" aria-label="Go to homepage">
            <img
              src={carsaLogo}
              alt="CarSa"
              style={{
                height: 38,
                width: "auto",
                objectFit: "contain",
              }}
            />
          </Link>

          <div className="mb-9">
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.82rem", letterSpacing: "0.14em", color: "#9A4700", textTransform: "uppercase", marginBottom: "0.75rem" }}>
              ● Member Access
            </p>
            <h1
              style={{
                fontFamily: "'Impact', 'Arial Black', sans-serif",
                fontSize: "2.8rem",
                color: "#2F4858",
                letterSpacing: "-0.01em",
                textTransform: "uppercase",
                lineHeight: 0.95,
                marginBottom: "0.75rem",
              }}
            >
              WELCOME <span style={{ color: BRAND }}>BACK</span>
            </h1>
            <p style={{ fontFamily: "'Courier New', monospace", fontSize: "0.92rem", color: "#2F4858", letterSpacing: "0.02em", lineHeight: 1.8 }}>
              Sign in to manage your garage records and service follow-up.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {successMessage ? (
              <div
                style={{
                  border: "1px solid rgba(16,185,129,0.2)",
                  background: "rgba(236,253,245,0.96)",
                  color: "#047857",
                  padding: "0.85rem 1rem",
                  borderRadius: "2px",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "0.72rem",
                  lineHeight: 1.6,
                }}
              >
                {successMessage}
              </div>
            ) : null}

            {error ? (
              <div
                style={{
                  border: "1px solid rgba(220,38,38,0.22)",
                  background: "rgba(254,242,242,0.95)",
                  color: "#b91c1c",
                  padding: "0.85rem 1rem",
                  borderRadius: "2px",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "0.72rem",
                  lineHeight: 1.6,
                }}
              >
                {error}
              </div>
            ) : null}

            <InputField
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
            />

            <InputField
              label="Password"
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
            >
              <button
                type="button"
                onClick={() => setShowPass((prev) => !prev)}
                style={{
                  position: "absolute",
                  right: "0.9rem",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "'Courier New', monospace",
                  fontSize: "0.75rem",
                  letterSpacing: "0.1em",
                  color: "#2F4858",
                  textTransform: "uppercase",
                }}
              >
                {showPass ? "Hide" : "Show"}
              </button>
            </InputField>

            <div className="flex items-center justify-between mt-0.5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="sr-only"
                />
                <div
                  style={{
                    width: 17,
                    height: 17,
                    border: `1.5px solid ${remember ? BRAND : "#8996A0"}`,
                    background: remember ? BRAND : "transparent",
                    borderRadius: "2px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                    flexShrink: 0,
                  }}
                >
                  {remember ? (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </div>
                <span style={{ fontFamily: "'Courier New', monospace", fontSize: "0.875rem", letterSpacing: "0.05em", color: "#2F4858", userSelect: "none" }}>
                  Remember me
                </span>
              </label>
              <span
                style={{
                  fontFamily: "'Courier New', monospace",
                  fontSize: "0.875rem",
                  letterSpacing: "0.05em",
                  color: "#2F4858",
                }}
              >
                Forgot password?
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: "0.75rem",
                width: "100%",
                padding: "1rem",
                background: loading ? "rgba(47,72,88,0.7)" : "#2F4858",
                color: "#fff",
                border: "none",
                fontFamily: "'Courier New', monospace",
                fontSize: "0.72rem",
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                fontWeight: "bold",
                cursor: loading ? "not-allowed" : "pointer",
                clipPath: "polygon(6px 0%, 100% 0%, calc(100% - 6px) 100%, 0% 100%)",
                boxShadow: "0 4px 22px rgba(47,72,88,0.32)",
                transition: "all 0.25s ease",
                opacity: loading ? 0.9 : 1,
              }}
              onMouseEnter={(e) => {
                if (loading) return;
                e.currentTarget.style.background = "#3d5e72";
                e.currentTarget.style.boxShadow = "0 6px 30px rgba(47,72,88,0.5)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                if (loading) return;
                e.currentTarget.style.background = "#2F4858";
                e.currentTarget.style.boxShadow = "0 4px 22px rgba(47,72,88,0.32)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

            <p style={{ textAlign: "center", fontFamily: "'Courier New', monospace", fontSize: "0.875rem", color: "#2F4858", letterSpacing: "0.03em", marginTop: "0.5rem" }}>
              Don&apos;t have an account?{" "}
              <Link
                to="/register-garage-admin"
                style={{
                  color: "#9A4700",
                  textDecoration: "none",
                  fontWeight: "bold",
                  borderBottom: `1px solid rgba(${BR},0.35)`,
                  paddingBottom: "1px",
                }}
              >
                Register your garage →
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
