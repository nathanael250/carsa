import { useEffect } from "react";
import { Link } from "react-router-dom";
import carsaLogo from "../assets/carsa.png";

const BRAND = "#FEA14C";
const DARK = "#2F4858";
const DARK_RGB = "47,72,88";

const LAST_UPDATED = "20 October 2026";
const CONTACT_EMAIL = "hello@autox.rw";
const CONTACT_PHONE = "+250 787 836 784";

type Section = {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: { term?: string; text: string }[];
};

const SECTIONS: Section[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    paragraphs: [
      "CarSa is a vehicle service platform that connects car owners with garages in Rwanda. Garages use CarSa to register vehicles, record the services they perform and collect payment. Car owners use the CarSa mobile app to see their vehicles, their service history and reminders for upcoming services.",
      "This policy explains what personal information CarSa collects through the mobile app and the CarSa website, why we collect it, who we share it with and the choices you have.",
    ],
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    items: [
      {
        term: "Account details",
        text: "Your name, email address, phone number, date of birth, gender and password. Passwords are stored only in encrypted (hashed) form. Your account may be created by you, or by a garage on your behalf when it registers your vehicle.",
      },
      {
        term: "Vehicle details",
        text: "License plate, make, model, year, fuel type and, where provided, the VIN of vehicles linked to your account.",
      },
      {
        term: "Service records",
        text: "The services performed on your vehicle, the garage and technician who performed them, dates, mileage, products used (such as engine oil), notes and costs.",
      },
      {
        term: "Payment information",
        text: "When you pay for a service, we record the mobile money phone number used, the amount, the payment status and the reference returned by our payment provider. We do not collect or store card numbers or mobile money PINs.",
      },
      {
        term: "Garage business information",
        text: "For garage accounts: the garage name, address, city, registration number and the business documents uploaded for verification.",
      },
      {
        term: "Device information",
        text: "A push notification token for your device, so we can send you notifications about your vehicles and services.",
      },
    ],
  },
  {
    id: "how-we-use",
    title: "How we use your information",
    items: [
      { text: "To create and manage your account and let you sign in." },
      { text: "To link vehicles to their owners and keep an accurate service history." },
      { text: "To process payments for services and confirm when they succeed or fail." },
      { text: "To send notifications, such as when a service starts or is completed, when a vehicle is added to your account, or when your next service is due." },
      { text: "To send account emails, such as email verification codes." },
      { text: "To verify and approve garages before they can use the platform." },
      { text: "To produce reports for garages and for CarSa administrators, such as revenue and service activity." },
      { text: "To keep the platform secure and to meet our legal obligations." },
    ],
  },
  {
    id: "sharing",
    title: "Who we share it with",
    paragraphs: ["We do not sell your personal information. We share it only as needed to run the service:"],
    items: [
      {
        term: "Garages",
        text: "Garages that serve your vehicle can see your name, contact details, vehicle details and the service records they create.",
      },
      {
        term: "Payment provider",
        text: "Transpip processes mobile money payments. We send it the phone number, amount and your name and email so the payment can be collected.",
      },
      {
        term: "Notifications",
        text: "Google Firebase Cloud Messaging delivers push notifications to your device.",
      },
      {
        term: "Email",
        text: "Our email service provider delivers account emails such as verification codes.",
      },
      {
        term: "Legal requirements",
        text: "We may disclose information when required by law or to protect the rights and safety of our users and of CarSa.",
      },
    ],
  },
  {
    id: "retention",
    title: "How long we keep it",
    paragraphs: [
      "We keep your information for as long as your account is active. When you delete your account, we delete your account and the personal details linked to it, except where we must keep certain records (for example payment records) to meet legal or accounting obligations.",
    ],
  },
  {
    id: "your-rights",
    title: "Your choices and rights",
    items: [
      { term: "Access and correction", text: "You can view and update your profile details in the app at any time." },
      { term: "Account deletion", text: "You can delete your account from the settings page in the CarSa app. You can also ask us to delete it by contacting us." },
      { term: "Notifications", text: "You can turn off push notifications in your device settings." },
      {
        term: "Other requests",
        text: "Under Rwanda's law on the protection of personal data and privacy, you may ask us for a copy of your data, object to its processing or ask us to restrict it. Contact us using the details below.",
      },
    ],
  },
  {
    id: "security",
    title: "Security",
    paragraphs: [
      "We protect your information with measures such as encrypted connections, hashed passwords and access controls that limit each user to the data their role needs. No system is completely secure, but we work to protect your information and to respond quickly to any issue.",
    ],
  },
  {
    id: "children",
    title: "Children",
    paragraphs: [
      "CarSa is intended for vehicle owners and garage staff. It is not directed at children, and we do not knowingly collect information from children.",
    ],
  },
  {
    id: "changes",
    title: "Changes to this policy",
    paragraphs: [
      "We may update this policy from time to time. When we do, we will change the date at the top of this page, and for significant changes we will let you know in the app.",
    ],
  },
];

export default function PrivacyPolicy() {
  useEffect(() => {
    document.title = "Privacy Policy · CarSa";
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: "#F7F8FA" }}>
      <header style={{ background: DARK }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
          <Link to="/" aria-label="Go to homepage">
            <img src={carsaLogo} alt="CarSa" style={{ height: 36, width: "auto", objectFit: "contain" }} />
          </Link>
          <Link
            to="/"
            className="text-xs font-bold uppercase"
            style={{ fontFamily: "'Courier New', monospace", color: BRAND, letterSpacing: "0.18em", textDecoration: "none" }}
          >
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div
          className="mb-3 text-xs font-bold uppercase"
          style={{ fontFamily: "'Courier New', monospace", color: BRAND, letterSpacing: "0.28em" }}
        >
          Legal
        </div>
        <h1
          className="text-4xl sm:text-5xl font-black uppercase leading-tight"
          style={{ fontFamily: "'Impact', 'Arial Black', sans-serif", color: DARK, letterSpacing: "-0.01em" }}
        >
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm" style={{ color: `rgba(${DARK_RGB},0.65)` }}>
          Last updated: {LAST_UPDATED}
        </p>

        <nav
          aria-label="On this page"
          className="mt-8 p-5 rounded-lg border bg-white"
          style={{ borderColor: `rgba(${DARK_RGB},0.12)` }}
        >
          <div className="text-xs font-bold uppercase mb-3" style={{ color: `rgba(${DARK_RGB},0.6)`, letterSpacing: "0.14em" }}>
            On this page
          </div>
          <ol className="grid gap-2 sm:grid-cols-2 text-sm list-decimal list-inside" style={{ color: DARK }}>
            {[...SECTIONS, { id: "contact", title: "Contact us" }].map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="hover:underline" style={{ color: DARK }}>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((section, index) => (
            <section key={section.id} id={section.id} className="scroll-mt-6">
              <h2 className="text-xl font-bold" style={{ color: DARK }}>
                <span style={{ color: BRAND }}>{index + 1}.</span> {section.title}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="mt-3 text-[15px] leading-7" style={{ color: `rgba(${DARK_RGB},0.85)` }}>
                  {paragraph}
                </p>
              ))}
              {section.items && (
                <ul className="mt-3 space-y-2 text-[15px] leading-7 list-disc pl-5" style={{ color: `rgba(${DARK_RGB},0.85)` }}>
                  {section.items.map((item) => (
                    <li key={item.term || item.text}>
                      {item.term && <strong style={{ color: DARK }}>{item.term}: </strong>}
                      {item.text}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <section id="contact" className="scroll-mt-6">
            <h2 className="text-xl font-bold" style={{ color: DARK }}>
              <span style={{ color: BRAND }}>{SECTIONS.length + 1}.</span> Contact us
            </h2>
            <p className="mt-3 text-[15px] leading-7" style={{ color: `rgba(${DARK_RGB},0.85)` }}>
              If you have questions about this policy or want to make a privacy request, contact us:
            </p>
            <div
              className="mt-4 p-5 rounded-lg bg-white border text-[15px] space-y-1"
              style={{ borderColor: `rgba(${DARK_RGB},0.12)`, color: DARK }}
            >
              <div>
                Email:{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: DARK, fontWeight: 600 }}>
                  {CONTACT_EMAIL}
                </a>
              </div>
              <div>
                Phone:{" "}
                <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`} style={{ color: DARK, fontWeight: 600 }}>
                  {CONTACT_PHONE}
                </a>
              </div>
              <div>Kigali, Rwanda</div>
            </div>
          </section>
        </div>
      </main>

      <footer style={{ background: DARK }}>
        <div
          className="max-w-4xl mx-auto px-4 sm:px-6 py-6 text-xs uppercase"
          style={{ fontFamily: "'Courier New', monospace", color: "rgba(255,255,255,0.62)", letterSpacing: "0.14em" }}
        >
          © {new Date().getFullYear()} CarSa. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
