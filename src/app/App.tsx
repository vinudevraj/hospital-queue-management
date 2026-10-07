import { useState, useEffect, useRef } from "react";
import {
  Users, Clock, Activity, Bell, Search, CheckCircle,
  AlertTriangle, ArrowRight, Star, TrendingUp, Zap, Shield,
  Heart, Stethoscope, Brain, Timer, QrCode,
  SkipForward, UserPlus, Volume2, Download,
  Menu, X, BarChart2, Check, Home, LayoutDashboard,
  Wifi, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
type Page = "landing" | "reception" | "patient" | "eta" | "doctors" | "analytics";
type PatientStatus = "consulting" | "waiting" | "completed";

interface Patient {
  patient_id: number;
  token: string;
  name: string;
  doctor: string;
  department?: string;
  status: PatientStatus;
  eta: string;
  isEmergency: boolean;
  waitMinutes: number;
  liveEta?: number;
  liveEtaSeconds?: number;
  condition: string;
  phone: string;
  age: number;
  registeredAt: string;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
const INITIAL_PATIENTS: Patient[] = [
  { token: "T001", name: "Priya Sharma", doctor: "Dr. Amit Mehta", status: "consulting", eta: "Now", isEmergency: false, waitMinutes: 0, condition: "Fever & Cold", phone: "+91 98765 43210", age: 34, registeredAt: "09:15 AM" },
  { token: "T002", name: "Rajesh Kumar", doctor: "Dr. Neha Sharma", status: "waiting", eta: "18 min", isEmergency: true, waitMinutes: 18, condition: "Chest Pain", phone: "+91 87654 32109", age: 58, registeredAt: "09:22 AM" },
  { token: "T003", name: "Anita Patel", doctor: "Dr. Raj Patel", status: "waiting", eta: "15 min", isEmergency: false, waitMinutes: 15, condition: "Knee Pain", phone: "+91 76543 21098", age: 45, registeredAt: "09:30 AM" },
  { token: "T004", name: "Vikram Singh", doctor: "Dr. Amit Mehta", status: "waiting", eta: "25 min", isEmergency: false, waitMinutes: 25, condition: "Back Pain", phone: "+91 65432 10987", age: 29, registeredAt: "09:35 AM" },
  { token: "T005", name: "Sunita Rao", doctor: "Dr. Neha Sharma", status: "waiting", eta: "35 min", isEmergency: false, waitMinutes: 35, condition: "High BP", phone: "+91 54321 09876", age: 52, registeredAt: "09:40 AM" },
  { token: "T006", name: "Arjun Nair", doctor: "Dr. Raj Patel", status: "waiting", eta: "30 min", isEmergency: false, waitMinutes: 30, condition: "Ankle Sprain", phone: "+91 43210 98765", age: 38, registeredAt: "09:45 AM" },
  { token: "T007", name: "Meena Krishnan", doctor: "Dr. Amit Mehta", status: "waiting", eta: "40 min", isEmergency: false, waitMinutes: 40, condition: "Diabetes Review", phone: "+91 32109 87654", age: 61, registeredAt: "09:50 AM" },
  { token: "T008", name: "Suresh Gupta", doctor: "Dr. Neha Sharma", status: "waiting", eta: "52 min", isEmergency: false, waitMinutes: 52, condition: "Palpitations", phone: "+91 21098 76543", age: 44, registeredAt: "09:55 AM" },
  { token: "T009", name: "Kavitha Menon", doctor: "Dr. Raj Patel", status: "waiting", eta: "45 min", isEmergency: false, waitMinutes: 45, condition: "Shoulder Pain", phone: "+91 10987 65432", age: 33, registeredAt: "10:00 AM" },
  { token: "T010", name: "Deepak Joshi", doctor: "Dr. Amit Mehta", status: "waiting", eta: "55 min", isEmergency: false, waitMinutes: 55, condition: "Headache", phone: "+91 09876 54321", age: 27, registeredAt: "10:05 AM" },
  { token: "T011", name: "Rekha Nair", doctor: "Dr. Neha Sharma", status: "waiting", eta: "65 min", isEmergency: false, waitMinutes: 65, condition: "Thyroid Review", phone: "+91 11111 22222", age: 49, registeredAt: "10:10 AM" },
  { token: "T012", name: "Mohan Pillai", doctor: "Dr. Raj Patel", status: "waiting", eta: "60 min", isEmergency: false, waitMinutes: 60, condition: "Hip Pain", phone: "+91 22222 33333", age: 67, registeredAt: "10:12 AM" },
];

const COMPLETED_TODAY = [
  { token: "C001", name: "Rohit Verma", doctor: "Dr. Amit Mehta", duration: "11 min", at: "08:45 AM" },
  { token: "C002", name: "Lakshmi Iyer", doctor: "Dr. Neha Sharma", duration: "19 min", at: "08:52 AM" },
  { token: "C003", name: "Prakash Reddy", doctor: "Dr. Raj Patel", duration: "14 min", at: "09:05 AM" },
  { token: "C004", name: "Divya Nambiar", doctor: "Dr. Amit Mehta", duration: "10 min", at: "09:14 AM" },
  { token: "C005", name: "Kiran Bhat", doctor: "Dr. Neha Sharma", duration: "22 min", at: "09:21 AM" },
  { token: "C006", name: "Smita Kulkarni", doctor: "Dr. Raj Patel", duration: "13 min", at: "09:33 AM" },
  { token: "C007", name: "Mohan Das", doctor: "Dr. Amit Mehta", duration: "9 min", at: "09:42 AM" },
  { token: "C008", name: "Padmini Sinha", doctor: "Dr. Neha Sharma", duration: "17 min", at: "09:58 AM" },
];



// ─── Chart Data ───────────────────────────────────────────────────────────────

const ttStyle = { backgroundColor: "white", border: "1px solid #A8CDE5", borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" };

// ─── Utility Components ───────────────────────────────────────────────────────

function GlassCard({ children, className = "", style = {}, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-white/70 backdrop-blur-md border border-white/50 shadow-lg rounded-2xl ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}

function StatusBadge({ status, isEmergency }: { status: string; isEmergency?: boolean }) {
  if (isEmergency) return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: "#B74A4215", color: "#B74A42", border: "1px solid #B74A4230" }}>
      Emergency
    </span>
  );
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    consulting: { bg: "#3F8EAC15", fg: "#3F8EAC", label: "Consulting" },
    waiting: { bg: "#A8CDE530", fg: "#283040", label: "Waiting" },
    completed: { bg: "#22c55e15", fg: "#16a34a", label: "Completed" },
    available: { bg: "#22c55e15", fg: "#16a34a", label: "Available" },
  };
  const c = map[status] || map.waiting;
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: c.bg, color: c.fg, border: `1px solid ${c.fg}30` }}>
      {c.label}
    </span>
  );
}

function AnimCounter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let n = 0;
    const inc = to / 50;
    const id = setInterval(() => {
      n = Math.min(n + inc, to);
      setVal(Math.floor(n));
      if (n >= to) clearInterval(id);
    }, 20);
    return () => clearInterval(id);
  }, [to]);
  return <>{prefix}{val}{suffix}</>;
}

function QRVisual({ token }: { token: string }) {
  const seed = token.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const grid = Array.from({ length: 9 }, (_, i) =>
    Array.from({ length: 9 }, (_, j) => {
      if ((i < 3 && j < 3) || (i < 3 && j > 5) || (i > 5 && j < 3)) return true;
      if ((i < 2 && j < 2) || (i < 2 && j > 6) || (i > 6 && j < 2)) return false;
      return ((seed * (i + 2) * (j + 3) + i * 7 + j * 11) % 5) > 2;
    })
  );
  return (
    <div className="inline-block p-3 bg-white rounded-xl border border-[#A8CDE5]/30">
      {grid.map((row, i) => (
        <div key={i} className="flex">
          {row.map((cell, j) => (
            <div key={j} style={{ width: 14, height: 14, backgroundColor: cell ? "#283040" : "white" }} />
          ))}
        </div>
      ))}
      <div className="text-center text-xs font-mono font-bold mt-1.5" style={{ color: "#3F8EAC" }}>{token}</div>
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

function AnimatedHero({ onNav }: { onNav: (p: Page) => void }) {
  const cards = [
    { token: "T001", name: "Priya S.", status: "Now", color: "#3F8EAC", emergency: false },
    { token: "T002", name: "Rajesh K.", status: "Emergency", color: "#B74A42", emergency: true },
    { token: "T003", name: "Anita P.", status: "12 min", color: "#7FB0CB", emergency: false },
    { token: "T004", name: "Vikram S.", status: "24 min", color: "#A8CDE5", emergency: false },
  ];
  return (
    <div className="relative w-full h-96 select-none">
      {/* Doctor panel */}
      <GlassCard className="absolute right-0 top-0 p-4 w-60" style={{ animation: "float 4s ease-in-out infinite" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-black text-sm" style={{ backgroundColor: "#3F8EAC" }}>RM</div>
          <div>
            <div className="font-bold text-sm" style={{ color: "#283040" }}>Dr. Mehta</div>
            <div className="text-xs" style={{ color: "#7FB0CB" }}>General Medicine</div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "#5a7a8a" }}>
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Consulting now
        </div>
        <div className="mt-3 pt-3 border-t border-[#A8CDE5]/30 text-xs font-medium" style={{ color: "#7FB0CB" }}>
          4 patients waiting
        </div>
      </GlassCard>

      {/* Patient queue cards */}
      {cards.map((c, i) => (
        <GlassCard
          key={c.token}
          className="absolute p-3 w-52"
          style={{
            top: `${68 + i * 68}px`,
            left: i % 2 === 0 ? "0" : "32px",
            animation: `float ${3.5 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.4}s`,
            opacity: 0.92,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ backgroundColor: c.color }}>
                {c.name[0]}
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: "#283040" }}>{c.name}</div>
                <div className="text-xs font-mono" style={{ color: "#7FB0CB" }}>{c.token}</div>
              </div>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: c.color + "20", color: c.color }}>
              {c.status}
            </span>
          </div>
        </GlassCard>
      ))}

      {/* Alert bubble */}
      <GlassCard className="absolute bottom-0 right-4 p-3 w-56 border-l-4" style={{ borderLeftColor: "#B74A42" }}>
        <div className="flex items-center gap-2">
          <Bell size={16} style={{ color: "#B74A42" }} className="animate-bounce" />
          <div>
            <div className="text-xs font-bold" style={{ color: "#283040" }}>Your turn is soon!</div>
            <div className="text-xs" style={{ color: "#5a7a8a" }}>3 patients ahead — return now.</div>
          </div>
        </div>
      </GlassCard>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}

function LandingPage({ onNav }: { onNav: (p: Page) => void }) {
  const features = [
    { icon: Timer, title: "Real-Time Queue Engine", desc: "Instant status updates across all devices the moment a patient is called.", color: "#3F8EAC" },
    { icon: Brain, title: "AI Wait Prediction", desc: "ML model trained on 12,000+ consultations. 94% prediction accuracy.", color: "#7FB0CB" },
    { icon: Bell, title: "Near-Turn Alerts", desc: "Notifies patients when 3 remain — so they arrive right on time.", color: "#B74A42" },
    { icon: QrCode, title: "QR Queue Access", desc: "Scan token QR code to view queue position on any device.", color: "#3F8EAC" },
    { icon: Shield, title: "Priority Management", desc: "Emergency patients auto-elevated with visual red-badge priority.", color: "#B74A42" },
    { icon: BarChart2, title: "Analytics Suite", desc: "Executive dashboards with efficiency scores, peak hours, and trends.", color: "#7FB0CB" },
  ];

  const steps = [
    { num: "01", icon: UserPlus, title: "Register at Reception", desc: "Patient is registered, assigned to a doctor, and receives a unique token with QR code." },
    { num: "02", icon: Wifi, title: "Wait Anywhere", desc: "Patient leaves the waiting room. Real-time updates sent to their device via the portal." },
    { num: "03", icon: Bell, title: "Return When Ready", desc: "Alert fires when 3 patients remain. Patient returns and is called in immediately." },
  ];

  const testimonials = [
    { name: "Dr. Ananya Rao", role: "Medical Director, Apollo Clinics", text: "Hospital Queue Management reduced our average patient wait time by 40%. The AI predictions are remarkably accurate and our staff adopted it within a day.", stars: 5 },
    { name: "Suresh Menon", role: "Operations Head, Fortis Healthcare", text: "Our patients love waiting at the café instead of the waiting room. Patient satisfaction scores hit an all-time high last quarter.", stars: 5 },
    { name: "Priya Krishnamurthy", role: "Clinic Administrator, Manipal", text: "The reception dashboard is intuitive and powerful. We went live in under 2 hours. Zero training required.", stars: 5 },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#DDEEF8", fontFamily: "Inter, sans-serif" }}>
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#A8CDE5]/30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#3F8EAC" }}>
              <Heart size={15} className="text-white" />
            </div>
            <span className="font-black text-xl" style={{ color: "#283040" }}>Hospital Queue Management</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: "#5a7a8a" }}>
            <a href="#features" className="hover:text-[#3F8EAC] transition-colors">Features</a>
            <a href="#how" className="hover:text-[#3F8EAC] transition-colors">How It Works</a>
            <a href="#testimonials" className="hover:text-[#3F8EAC] transition-colors">Testimonials</a>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => onNav("reception")} className="text-sm font-semibold hover:text-[#3F8EAC] transition-colors" style={{ color: "#5a7a8a" }}>Sign In</button>
            <button onClick={() => onNav("reception")} className="px-4 py-2 rounded-xl text-sm font-bold text-white hover:opacity-90 hover:shadow-lg transition-all" style={{ backgroundColor: "#3F8EAC" }}>Get Started</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold mb-6" style={{ backgroundColor: "#3F8EAC15", color: "#3F8EAC", border: "1px solid #3F8EAC30" }}>
              <Zap size={11} /> AI-Powered Hospital Queue Management
            </div>
            <h1 className="text-5xl lg:text-6xl font-black leading-tight mb-5" style={{ color: "#283040" }}>
              Predict Wait Time.<br />
              <span style={{ color: "#3F8EAC" }}>Manage the Queue.</span>
            </h1>
            <p className="text-lg leading-relaxed mb-8 max-w-lg" style={{ color: "#5a7a8a" }}>
              An AI-powered hospital queue management system that predicts patient waiting time using hospital visit and staffing data.
            </p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => onNav("reception")} className="px-6 py-3.5 rounded-xl font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-2" style={{ backgroundColor: "#3F8EAC" }}>
                Get Started <ArrowRight size={16} />
              </button>
              <button onClick={() => onNav("patient")} className="px-6 py-3.5 rounded-xl font-bold border-2 hover:-translate-y-0.5 transition-all" style={{ borderColor: "#3F8EAC", color: "#3F8EAC" }}>
                Patient Prediction
              </button>
            </div>
            <div className="mt-10 flex gap-8">
              {[{ v: "5,000", l: "Patient Records" }, { v: "50", l: "Providers" }, { v: "10", l: "Departments" }].map(s => (
                <div key={s.l}>
                  <div className="text-2xl font-black" style={{ color: "#3F8EAC" }}>{s.v}</div>
                  <div className="text-xs font-medium mt-0.5" style={{ color: "#7FB0CB" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:block">
            <AnimatedHero onNav={onNav} />
          </div>
        </div>
      </section>

      {/* Stats Banner */}
      <section className="py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <GlassCard className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { label: "Patients Served", to: 128450, suffix: "+" },
                { label: "Wait Reduction", to: 40, suffix: "%" },
                { label: "Clinics Onboarded", to: 512, suffix: "+" },
                { label: "Cities Covered", to: 28, suffix: "" },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-4xl font-black mb-1" style={{ color: "#3F8EAC" }}>
                    <AnimCounter to={s.to} suffix={s.suffix} />
                  </div>
                  <div className="text-sm font-medium" style={{ color: "#5a7a8a" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black mb-4" style={{ color: "#283040" }}>Everything a clinic needs</h2>
            <p className="max-w-md mx-auto" style={{ color: "#5a7a8a" }}>A complete patient flow management platform built for modern healthcare.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(f => (
              <GlassCard key={f.title} className="p-6 hover:shadow-xl hover:-translate-y-1 transition-all cursor-default">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: f.color + "15" }}>
                  <f.icon size={24} style={{ color: f.color }} />
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: "#283040" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#5a7a8a" }}>{f.desc}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black mb-4" style={{ color: "#283040" }}>How It Works</h2>
            <p style={{ color: "#5a7a8a" }}>Three effortless steps to a better clinic experience.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((s, i) => (
              <div key={s.num} className="relative">
                <GlassCard className="p-8">
                  <div className="text-6xl font-black mb-4 leading-none" style={{ color: "#3F8EAC08" }}>{s.num}</div>
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "#3F8EAC" }}>
                    <s.icon size={22} className="text-white" />
                  </div>
                  <h3 className="font-bold text-xl mb-3" style={{ color: "#283040" }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#5a7a8a" }}>{s.desc}</p>
                </GlassCard>
                {i < 2 && (
                  <div className="hidden md:flex absolute top-1/2 -right-4 z-10 w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: "#3F8EAC" }}>
                    <ArrowRight size={14} className="text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <GlassCard className="p-12 text-center" style={{ background: "linear-gradient(135deg, rgba(63,142,172,0.08), rgba(168,205,229,0.15))" }}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: "#3F8EAC" }}>
              <Heart size={28} className="text-white" />
            </div>
            <h2 className="text-4xl font-black mb-4" style={{ color: "#283040" }}>Ready to transform your clinic?</h2>
            <p className="mb-8 max-w-xl mx-auto" style={{ color: "#5a7a8a" }}>Use patient and hospital information to estimate waiting time and support efficient queue management.</p>
            <div className="flex flex-wrap justify-center gap-4">
              <button onClick={() => onNav("reception")} className="px-8 py-4 rounded-xl font-bold text-white shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center gap-2" style={{ backgroundColor: "#3F8EAC" }}>
                Start Free Trial <ArrowRight size={18} />
              </button>
              <button onClick={() => onNav("analytics")} className="px-8 py-4 rounded-xl font-bold border-2 hover:-translate-y-0.5 transition-all flex items-center gap-2" style={{ borderColor: "#3F8EAC", color: "#3F8EAC" }}>
                View Analytics Demo
              </button>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-[#A8CDE5]/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#3F8EAC" }}>
              <Heart size={11} className="text-white" />
            </div>
            <span className="font-black text-sm" style={{ color: "#283040" }}>Hospital Queue Management</span>
          </div>
          <p className="text-xs" style={{ color: "#7FB0CB" }}>© 2024 Hospital Queue Management Health Technologies. Healthcare that knows when it&apos;s your turn.</p>
          <div className="flex gap-4 text-xs font-medium" style={{ color: "#7FB0CB" }}>
            <a href="#" className="hover:text-[#3F8EAC] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#3F8EAC] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#3F8EAC] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Reception Dashboard ──────────────────────────────────────────────────────

function ReceptionPage({ patients, setPatients }: { patients: Patient[]; setPatients: React.Dispatch<React.SetStateAction<Patient[]>> }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | PatientStatus>("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DbDoctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [servedToday, setServedToday] = useState(0);
  const [form, setForm] = useState({
    name: "",
    department: "Internal Medicine",
    doctor: "",
    condition: "",
    phone: "",
    age: "",
    triageCategory: "Non-urgent",
    isEmergency: false,
  });

  useEffect(() => {
    fetch("http://127.0.0.1:5000/doctors")
      .then(res => {
        if (!res.ok) throw new Error("Failed to load doctors");
        return res.json();
      })
      .then(data => {
        setDoctors(data);
        if (data.length > 0) {
          setForm(f => ({ ...f, doctor: data[0].doctor_id }));
        }
      })
      .catch(error => {
        console.error("Failed to load doctors:", error);
      })
      .finally(() => {
        setDoctorsLoading(false);
      });
  }, []);

  const refreshInProgress = useRef(false);
  const actionInProgress = useRef(false);

  const refreshLiveQueue = async () => {
    if (refreshInProgress.current || actionInProgress.current) {
      return;
    }

    refreshInProgress.current = true;

    try {
      const [patientsResponse, queueResponse] = await Promise.all([
        fetch("http://127.0.0.1:5000/patients", {
          cache: "no-store",
        }),
        fetch("http://127.0.0.1:5000/queue", {
          cache: "no-store",
        }),
      ]);

      if (!patientsResponse.ok || !queueResponse.ok) {
        throw new Error("Failed to load live queue data.");
      }

      const patientsData = await patientsResponse.json();
      const queueData = await queueResponse.json();

      const liveQueue = queueData.queue || [];

      const allPatients = Array.isArray(patientsData)
        ? patientsData
        : patientsData.patients || [];

      const completedToday = allPatients.filter(
        (patient: any) => patient.status === "completed"
      ).length;

      setServedToday(completedToday);

      const livePatients: Patient[] = allPatients.map(
        (dbPatient: any) => {
          const livePatient = liveQueue.find(
            (q: any) => q.token === dbPatient.token
          );

          return {
            patient_id: dbPatient.patient_id,
            token: dbPatient.token,
            name: dbPatient.patient_name,
            doctor:
              dbPatient.doctor_name ||
              dbPatient.doctor_id ||
              "Not assigned",
            department: dbPatient.department || "General",
            status: dbPatient.status as PatientStatus,
            eta:
              dbPatient.status === "consulting"
                ? "Now"
                : `${dbPatient.predicted_wait_time ?? 0} min`,
            isEmergency: Boolean(dbPatient.is_emergency),
            waitMinutes: dbPatient.predicted_wait_time ?? 0,
            liveEta: livePatient?.live_eta_minutes,
            liveEtaSeconds: livePatient?.live_eta_seconds,
            condition: dbPatient.condition_name || "General",
            phone: dbPatient.phone || "",
            age: dbPatient.age || 0,
            registeredAt: dbPatient.registered_at
              ? new Date(dbPatient.registered_at).toLocaleTimeString(
                  "en-IN",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )
              : "",
          };
        }
      );

      const queueOrder = new Map(
        liveQueue.map((q: any, index: number) => [
          q.token,
          index,
        ])
      );

      const orderedPatients = [...livePatients].sort((a, b) => {
        const aActive = queueOrder.has(a.token);
        const bActive = queueOrder.has(b.token);

        if (aActive && bActive) {
          return (
            (queueOrder.get(a.token) ?? 0) -
            (queueOrder.get(b.token) ?? 0)
          );
        }

        if (aActive) return -1;
        if (bActive) return 1;

        return 0;
      });

      setPatients(currentPatients => {
        const currentByToken = new Map(
          currentPatients.map(patient => [patient.token, patient])
        );

        return orderedPatients.map(patient => {
          const current = currentByToken.get(patient.token);

          if (
            current &&
            current.status === "waiting" &&
            patient.status === "waiting" &&
            current.liveEtaSeconds !== undefined &&
            patient.liveEtaSeconds !== undefined
          ) {
            return {
              ...patient,
              liveEtaSeconds: Math.min(
                current.liveEtaSeconds,
                patient.liveEtaSeconds
              ),
              liveEta: Math.ceil(
                Math.min(
                  current.liveEtaSeconds,
                  patient.liveEtaSeconds
                ) / 60
              ),
            };
          }

          return patient;
        });
      });
    } catch (error) {
      console.error("Live dashboard refresh failed:", error);
    } finally {
      refreshInProgress.current = false;
    }
  };

  useEffect(() => {
    refreshLiveQueue();

    const interval = setInterval(() => {
      if (!actionInProgress.current) {
        refreshLiveQueue();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const countdown = setInterval(() => {
      setPatients(current =>
        current.map(patient => {
          if (
            patient.status !== "waiting" ||
            patient.liveEtaSeconds === undefined
          ) {
            return patient;
          }

          const nextSeconds = Math.max(
            0,
            patient.liveEtaSeconds - 1
          );

          return {
            ...patient,
            liveEtaSeconds: nextSeconds,
            liveEta: Math.ceil(nextSeconds / 60),
          };
        })
      );
    }, 1000);

    return () => clearInterval(countdown);
  }, []);

  const waiting = patients.filter(p => p.status === "waiting").length;
  const consulting = patients.filter(p => p.status === "consulting").length;
  const completedNow = patients.filter(p => p.status === "completed").length;
  const avgWait = waiting > 0 ? Math.round(patients.filter(p => p.status === "waiting").reduce((a, p) => a + p.waitMinutes, 0) / waiting) : 0;

  const toast = (msg: string) => { setNotif(msg); setTimeout(() => setNotif(null), 3000); };

  const runQueueAction = async (
    action: () => Promise<void>
  ) => {
    if (actionInProgress.current) {
      return;
    }

    actionInProgress.current = true;

    try {
      await action();
    } finally {
      actionInProgress.current = false;
    }

    await refreshLiveQueue();
  };

  const callNext = async () => {
    await runQueueAction(async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/queue/call-next",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              department: departmentFilter,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to call next patient."
          );
        }

        toast(
          data.token
            ? `${data.token} has been called.`
            : "Next patient has been called."
        );
      } catch (error) {
        console.error("Call Next failed:", error);
        toast(
          error instanceof Error
            ? error.message
            : "Unable to call next patient."
        );
      }
    });
  };

  const complete = async (patientId: number, token: string) => {
    await runQueueAction(async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:5000/queue/complete/${patientId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to complete consultation."
          );
        }

        toast(`${token} consultation completed.`);
      } catch (error) {
        console.error("Complete failed:", error);
        toast(
          error instanceof Error
            ? error.message
            : "Unable to complete consultation."
        );
      }
    });
  };

  const skip = async (patientId: number, token: string) => {
    await runQueueAction(async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:5000/queue/skip/${patientId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to skip patient."
          );
        }

        toast(`${token} moved to the end of the queue.`);
      } catch (error) {
        console.error("Skip failed:", error);
        toast(
          error instanceof Error
            ? error.message
            : "Unable to skip patient."
        );
      }
    });
  };

  const markEmergency = async (
    patientId: number,
    token: string,
    isEmergency: boolean
  ) => {
    await runQueueAction(async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:5000/queue/emergency/${patientId}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Unable to update priority."
          );
        }

        toast(
          data.is_emergency
            ? `${token} moved to emergency priority.`
            : `${token} returned to normal priority.`
        );
      } catch (error) {
        console.error("Emergency update failed:", error);
        toast(
          error instanceof Error
            ? error.message
            : "Unable to update priority."
        );
      }
    });
  };

  const register = async () => {
    if (!form.name.trim()) return;

    const age = parseInt(form.age) || 30;

    let ageGroup = "Adult (36-60)";

    if (age <= 17) {
      ageGroup = "Child (0-17)";
    } else if (age <= 35) {
      ageGroup = "Young Adult (18-35)";
    } else if (age <= 60) {
      ageGroup = "Adult (36-60)";
    } else {
      ageGroup = "Senior (61+)";
    }

    const now = new Date();

    const dayOfWeek = now.toLocaleDateString("en-US", {
      weekday: "long"
    });

    const isWeekend = now.getDay() === 0 || now.getDay() === 6 ? 1 : 0;

    const waitingPatients = patients.filter(
      patient => patient.status === "waiting"
    ).length;

    const facilityOccupancyRate = Math.min(
      1,
      0.30 + waitingPatients * 0.02
    );

    try {
      const predictionResponse = await fetch(
        "http://127.0.0.1:5000/predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            AgeGroup: ageGroup,
            Department: form.department,
            AppointmentType: "New Patient",
            ArrivalMethod: "Walk-in",
            TriageCategory: form.triageCategory,
            FacilityOccupancyRate: facilityOccupancyRate,
            ProvidersOnShift: 1,
            NursesOnShift: 2,
            StaffToPatientRatio: 0.5,
            ArrivalHour: now.getHours(),
            DayOfWeek: dayOfWeek,
            IsWeekend: isWeekend,
            Month: now.getMonth() + 1,
          }),
        }
      );

      if (!predictionResponse.ok) {
        throw new Error("ML prediction failed");
      }

      const predictionData = await predictionResponse.json();

      const predictedWaitTime = Math.max(
        0,
        Math.round(predictionData.predicted_wait_time_minutes)
      );

      const selectedDoctor = doctors.find(
        doctor => doctor.doctor_id === form.doctor
      );

      if (!selectedDoctor) {
        throw new Error("Doctor not found");
      }

      const patientResponse = await fetch(
        "http://127.0.0.1:5000/patients",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            patient_name: form.name,
            age: age,
            phone: form.phone,
            condition_name: form.condition || "General",
            doctor_id: selectedDoctor.doctor_id,
            department: form.department,
            triage_category: form.triageCategory,
            predicted_wait_time: predictedWaitTime,
            is_emergency: form.isEmergency,
            appointment_date: now.toISOString().slice(0, 19).replace("T", " "),
          }),
        }
      );

      if (!patientResponse.ok) {
        const errorData = await patientResponse.json();
        throw new Error(
          errorData.error || "Patient registration failed"
        );
      }

      const patientData = await patientResponse.json();

      const newP: Patient = {
        patient_id: patientData.patient_id,
        token: patientData.token,
        name: form.name,
        doctor: form.doctor,
        status: "waiting",
        eta: `${predictedWaitTime} min`,
        isEmergency: form.isEmergency,
        waitMinutes: predictedWaitTime,
        condition: form.condition || "General",
        phone: form.phone,
        age,
        registeredAt: now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit"
        }),
      };

      setPatients(prev =>
        form.isEmergency
          ? [newP, ...prev]
          : [...prev, newP]
      );

      setForm(f => ({
        ...f,
        name: "",
        condition: "",
        phone: "",
        age: "",
        triageCategory: "Non-urgent",
        isEmergency: false,
      }));

      setShowModal(false);

      toast(
        `Token ${patientData.token} issued. Predicted wait: ${predictedWaitTime} min.`
      );

    } catch (error) {
      console.error("Registration error:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Unable to register patient.";

      toast(message);
    }
  };

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    return (p.name.toLowerCase().includes(q) || p.token.toLowerCase().includes(q)) &&
      (filter === "all" || p.status === filter) &&
      (departmentFilter === "all" || p.department === departmentFilter);
  });

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: "#DDEEF8" }}>
      {notif && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-xl" style={{ backgroundColor: "#3F8EAC" }}>
          <Check size={16} /> {notif}
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black" style={{ color: "#283040" }}>Reception Dashboard</h1>
            <p className="text-sm mt-1" style={{ color: "#7FB0CB" }}>
              Live queue management · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={callNext} className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all" style={{ backgroundColor: "#7FB0CB" }}>
              <Volume2 size={17} /> Call Next
            </button>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all" style={{ backgroundColor: "#3F8EAC" }}>
              <UserPlus size={17} /> Register Patient
            </button>
          </div>
        </div>

        {/* Metric Widgets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Active Queue", value: patients.filter(p => p.status !== "completed").length, icon: Users, color: "#3F8EAC" },
            { label: "Patients Waiting", value: waiting, icon: Clock, color: "#7FB0CB" },
            { label: "Avg Wait Time", value: `${avgWait} min`, icon: Timer, color: "#B74A42" },
            { label: "Served Today", value: servedToday, icon: CheckCircle, color: "#22c55e" },
          ].map(m => (
            <GlassCard key={m.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "#5a7a8a" }}>{m.label}</p>
                  <p className="text-3xl font-black mt-1" style={{ color: "#283040" }}>{m.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: m.color + "15" }}>
                  <m.icon size={20} style={{ color: m.color }} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div className="flex gap-2 flex-wrap">
            {(["all", "waiting", "consulting", "completed"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className="px-4 py-2 rounded-xl text-sm font-semibold capitalize transition-all" style={filter === f ? { backgroundColor: "#3F8EAC", color: "white" } : { backgroundColor: "rgba(255,255,255,0.6)", color: "#5a7a8a" }}>
                {f}
              </button>
            ))}
          </div>

          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 rounded-xl text-sm font-semibold outline-none"
            style={{
              backgroundColor: "rgba(255,255,255,0.7)",
              color: "#5a7a8a",
              border: "1px solid rgba(168,205,229,0.4)"
            }}
          >
            <option value="all">All Departments</option>
            <option value="Emergency">Emergency</option>
            <option value="Cardiology">Cardiology</option>
            <option value="General Surgery">General Surgery</option>
            <option value="Orthopedics">Orthopedics</option>
            <option value="Radiology">Radiology</option>
            <option value="Obstetrics">Obstetrics</option>
            <option value="Neurology">Neurology</option>
            <option value="Oncology">Oncology</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="Internal Medicine">Internal Medicine</option>
          </select>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.7)", border: "1px solid rgba(168,205,229,0.4)" }}>
            <Search size={15} style={{ color: "#7FB0CB" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or token…" className="bg-transparent outline-none text-sm w-44" style={{ color: "#283040" }} />
          </div>
        </div>

        {/* Queue Table */}
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[9%]" />
                <col className="w-[18%]" />
                <col className="w-[16%]" />
                <col className="w-[12%]" />
                <col className="w-[13%]" />
                <col className="w-[13%]" />
                <col className="w-[10%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(168,205,229,0.3)" }}>
                  {["Token", "Patient", "Doctor", "Condition", "Status", "AI Predicted Wait", "Live Wait", "Actions"].map(h => (
                    <th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider" style={{ color: "#7FB0CB" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.token} className="hover:bg-white/40 transition-colors" style={{ borderBottom: "1px solid rgba(168,205,229,0.15)", backgroundColor: p.isEmergency ? "rgba(183,74,66,0.03)" : undefined }}>
                    <td className="px-5 py-4">
                      <span className="font-mono font-black text-sm" style={{ color: "#3F8EAC" }}>{p.token}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{ backgroundColor: p.isEmergency ? "#B74A42" : "#3F8EAC" }}>
                          {p.name[0]}
                        </div>
                        <div>
                          <div className="font-semibold text-sm" style={{ color: "#283040" }}>{p.name}</div>
                          <div className="text-xs" style={{ color: "#7FB0CB" }}>Age {p.age} · {p.registeredAt}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium" style={{ color: "#283040" }}>{p.doctor}</td>
                    <td className="px-5 py-4 text-sm" style={{ color: "#5a7a8a" }}>{p.condition}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={p.status} />
                        {p.isEmergency && <StatusBadge status="emergency" isEmergency />}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-sm font-bold" style={{ color: "#283040" }}>
                        {p.waitMinutes} min
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className="text-sm font-bold"
                        style={{ color: p.status === "consulting" ? "#3F8EAC" : "#283040" }}
                      >
                        {p.status === "consulting"
                          ? "Now"
                          : p.status === "waiting"
                            ? p.liveEtaSeconds !== undefined
                              ? `${Math.ceil(p.liveEtaSeconds / 60)} min`
                              : `${p.liveEta ?? p.waitMinutes} min`
                            : "—"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {p.status === "consulting" && (
                          <button onClick={() => complete(p.patient_id, p.token)} title="Complete consultation" className="p-1.5 rounded-lg hover:bg-green-50 transition-colors">
                            <CheckCircle size={17} className="text-green-500" />
                          </button>
                        )}
                        {p.status === "waiting" && (
                          <>
                            <button onClick={() => skip(p.patient_id, p.token)} title="Skip patient" className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                              <SkipForward size={17} className="text-amber-500" />
                            </button>
                            <button onClick={() => markEmergency(p.patient_id, p.token, p.isEmergency)} title="Toggle emergency" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                              <AlertTriangle size={17} style={{ color: p.isEmergency ? "#B74A42" : "#ccc" }} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-14 text-center text-sm" style={{ color: "#7FB0CB" }}>No patients found.</div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Register Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-sm p-4">
          <GlassCard className="w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black" style={{ color: "#283040" }}>Register Patient</h2>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-[#A8CDE5]/20 transition-colors">
                <X size={20} style={{ color: "#283040" }} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5a7a8a" }}>Full Name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Patient full name" className="w-full mt-1.5 px-4 py-3 rounded-xl text-sm outline-none transition-colors" style={{ border: "1.5px solid rgba(168,205,229,0.5)", backgroundColor: "rgba(255,255,255,0.7)", color: "#283040" }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5a7a8a" }}>Age</label>
                  <input type="number" value={form.age} onChange={e => setForm(f => ({ ...f, age: e.target.value }))} placeholder="Age" className="w-full mt-1.5 px-4 py-3 rounded-xl text-sm outline-none" style={{ border: "1.5px solid rgba(168,205,229,0.5)", backgroundColor: "rgba(255,255,255,0.7)", color: "#283040" }} />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5a7a8a" }}>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" className="w-full mt-1.5 px-4 py-3 rounded-xl text-sm outline-none" style={{ border: "1.5px solid rgba(168,205,229,0.5)", backgroundColor: "rgba(255,255,255,0.7)", color: "#283040" }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5a7a8a" }}>Department</label>
                <select
                  value={form.department}
                  onChange={e => {
                    const selectedDepartment = e.target.value;
                    const selectedDoctor = doctors.find(
                      doctor => doctor.department === selectedDepartment
                    );

                    setForm(f => ({
                      ...f,
                      department: selectedDepartment,
                      doctor: selectedDoctor?.doctor_id || "",
                    }));
                  }}
                  className="w-full mt-1.5 px-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    border: "1.5px solid rgba(168,205,229,0.5)",
                    backgroundColor: "rgba(255,255,255,0.7)",
                    color: "#283040"
                  }}
                >
                  {[...new Set(doctors.map(doctor => doctor.department))].map(
                    department => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5a7a8a" }}>Triage Category</label>
                <select
                  value={form.triageCategory}
                  onChange={e => setForm(f => ({ ...f, triageCategory: e.target.value }))}
                  className="w-full mt-1.5 px-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    border: "1.5px solid rgba(168,205,229,0.5)",
                    backgroundColor: "rgba(255,255,255,0.7)",
                    color: "#283040"
                  }}
                >
                  <option value="Emergency">Emergency</option>
                  <option value="Immediate">Immediate</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Semi-urgent">Semi-urgent</option>
                  <option value="Non-urgent">Non-urgent</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5a7a8a" }}>Assign Doctor</label>
                <select
                  value={form.doctor}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      doctor: e.target.value,
                    }))
                  }
                  disabled={doctorsLoading || doctors.length === 0}
                  className="w-full mt-1.5 px-4 py-3 rounded-xl text-sm outline-none"
                  style={{
                    border: "1.5px solid rgba(168,205,229,0.5)",
                    backgroundColor: "rgba(255,255,255,0.7)",
                    color: "#283040"
                  }}
                >
                  {doctorsLoading ? (
                    <option>Loading doctors...</option>
                  ) : doctors.filter(
                      doctor => doctor.department === form.department
                    ).length === 0 ? (
                    <option value="">No doctors available</option>
                  ) : (
                    doctors
                      .filter(doctor => doctor.department === form.department)
                      .map(doctor => (
                        <option key={doctor.doctor_id} value={doctor.doctor_id}>
                          {doctor.doctor_id} — {doctor.doctor_name}
                        </option>
                      ))
                  )}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5a7a8a" }}>Chief Complaint</label>
                <input value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))} placeholder="e.g. Fever, Back Pain, Follow-up…" className="w-full mt-1.5 px-4 py-3 rounded-xl text-sm outline-none" style={{ border: "1.5px solid rgba(168,205,229,0.5)", backgroundColor: "rgba(255,255,255,0.7)", color: "#283040" }} />
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input type="checkbox" checked={form.isEmergency} onChange={e => setForm(f => ({ ...f, isEmergency: e.target.checked }))} className="w-4 h-4 rounded accent-[#B74A42]" />
                <span className="text-sm font-semibold" style={{ color: "#B74A42" }}>Mark as Emergency — Priority Queue</span>
              </label>
              <button onClick={register} disabled={!form.name.trim()} className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none" style={{ backgroundColor: "#3F8EAC" }}>
                Issue Token &amp; Register Patient
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

// ─── Patient Tracking Portal ──────────────────────────────────────────────────

function PatientPage() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [token, setToken] = useState("");
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const visitDate = currentTime.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const visitTime = currentTime.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const getAgeGroup = (age: number) => {
    if (age <= 17) return "Pediatric (0-17)";
    if (age <= 35) return "Young Adult (18-35)";
    if (age <= 60) return "Adult (36-60)";
    return "Senior (61+)";
  };

  const lookupPatient = async () => {
    const enteredToken = token.trim().toUpperCase();

    if (!enteredToken) {
      setError("Please enter your token number.");
      setPatient(null);
      return;
    }

    setLoading(true);
    setError("");
    setPatient(null);

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/patients/token/${encodeURIComponent(enteredToken)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Patient token could not be found."
        );
      }

      setPatient(data);
    } catch (err: any) {
      setError(
        err.message ||
        "Unable to connect to the hospital queue server."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!patient?.token) {
      return;
    }

    const refreshPatient = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:5000/patients/token/${encodeURIComponent(patient.token)}`
        );

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setPatient(data);
      } catch {
        // Keep the last successful patient state if a refresh fails.
      }
    };

    const interval = setInterval(refreshPatient, 5000);

    return () => clearInterval(interval);
  }, [patient?.token]);

  const liveWaitSeconds =
    patient?.status === "consulting"
      ? 0
      : patient?.live_eta_seconds !== null &&
        patient?.live_eta_seconds !== undefined
      ? patient.live_eta_seconds
      : (patient?.live_eta_minutes ?? patient?.predicted_wait_time ?? 0) * 60;

  const liveWait = Math.floor(liveWaitSeconds / 60);

  const statusLabel =
    patient?.status === "consulting"
      ? "Consulting Now"
      : patient?.status === "completed"
      ? "Completed"
      : patient?.status === "waiting"
      ? "Waiting"
      : patient?.status || "";

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="max-w-5xl mx-auto">

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#E8F4F8" }}
            >
              <Brain
                className="w-6 h-6"
                style={{ color: "#3F8EAC" }}
              />
            </div>

            <div>
              <h1
                className="text-3xl font-bold"
                style={{ color: "#173B4D" }}
              >
                Check Your Waiting Time
              </h1>

              <p
                className="mt-1"
                style={{ color: "#5a7a8a" }}
              >
                Enter your token number to view your hospital queue details.
              </p>
            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-6 mb-6 border"
          style={{
            backgroundColor: "#F7FBFC",
            borderColor: "#D9EAF0",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Clock
              className="w-5 h-5"
              style={{ color: "#3F8EAC" }}
            />

            <h2
              className="text-lg font-bold"
              style={{ color: "#173B4D" }}
            >
              Your Visit Details
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            <div
              className="rounded-xl p-4 border"
              style={{
                backgroundColor: "white",
                borderColor: "#D9EAF0",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: "#7A929E" }}
              >
                Visit Date
              </p>

              <p
                className="text-lg font-semibold"
                style={{ color: "#173B4D" }}
              >
                {visitDate}
              </p>

            </div>

            <div
              className="rounded-xl p-4 border"
              style={{
                backgroundColor: "white",
                borderColor: "#D9EAF0",
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: "#7A929E" }}
              >
                Current Time
              </p>

              <p
                className="text-lg font-semibold"
                style={{ color: "#173B4D" }}
              >
                {visitTime}
              </p>

            </div>
          </div>
        </div>

        <div
          className="rounded-2xl p-6 border"
          style={{
            backgroundColor: "white",
            borderColor: "#D9EAF0",
          }}
        >
          <h2
            className="text-lg font-bold mb-6"
            style={{ color: "#173B4D" }}
          >
            Patient Information
          </h2>

          <div>
            <label
              className="block text-sm font-semibold mb-2"
              style={{ color: "#365766" }}
            >
              Token Number
            </label>

            <div className="flex flex-col md:flex-row gap-3">
              <input
                value={token}
                onChange={(e) => {
                  setToken(e.target.value.toUpperCase());
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    lookupPatient();
                  }
                }}
                placeholder="Enter your token number, e.g. T5017"
                className="flex-1 px-4 py-3 rounded-xl border outline-none"
                style={{ borderColor: "#C9DEE6" }}
              />

              <button
                onClick={lookupPatient}
                disabled={loading}
                className="px-7 py-3 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: "#3F8EAC" }}
              >
                {loading ? "Checking..." : "View My Queue"}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="mt-5 p-4 rounded-xl text-sm"
              style={{
                backgroundColor: "#FDECEC",
                color: "#A33A35",
              }}
            >
              {error}
            </div>
          )}

          {patient && !error && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">

                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#365766" }}
                  >
                    Patient Name
                  </label>
                  <div
                    className="w-full px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: "#D9EAF0",
                      backgroundColor: "#F7FBFC",
                      color: "#173B4D",
                    }}
                  >
                    {patient.patient_name}
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#365766" }}
                  >
                    Age
                  </label>
                  <div
                    className="w-full px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: "#D9EAF0",
                      backgroundColor: "#F7FBFC",
                      color: "#173B4D",
                    }}
                  >
                    {patient.age} years · {getAgeGroup(patient.age)}
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#365766" }}
                  >
                    Doctor
                  </label>
                  <div
                    className="w-full px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: "#D9EAF0",
                      backgroundColor: "#F7FBFC",
                      color: "#173B4D",
                    }}
                  >
                    {patient.doctor_name || "Not assigned"}
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#365766" }}
                  >
                    Department
                  </label>
                  <div
                    className="w-full px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: "#D9EAF0",
                      backgroundColor: "#F7FBFC",
                      color: "#173B4D",
                    }}
                  >
                    {patient.department}
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#365766" }}
                  >
                    Condition
                  </label>
                  <div
                    className="w-full px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: "#D9EAF0",
                      backgroundColor: "#F7FBFC",
                      color: "#173B4D",
                    }}
                  >
                    {patient.condition_name}
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#365766" }}
                  >
                    Triage Category
                  </label>
                  <div
                    className="w-full px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: "#D9EAF0",
                      backgroundColor: "#F7FBFC",
                      color: "#173B4D",
                    }}
                  >
                    {patient.triage_category}
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#365766" }}
                  >
                    Queue Position
                  </label>
                  <div
                    className="w-full px-4 py-3 rounded-xl border"
                    style={{
                      borderColor: "#D9EAF0",
                      backgroundColor: "#F7FBFC",
                      color: "#173B4D",
                    }}
                  >
                    {patient.queue_position === 0
                      ? "Consulting Now"
                      : patient.queue_position
                      ? `#${patient.queue_position}`
                      : "Not in active queue"}
                  </div>
                </div>

                <div>
                  <label
                    className="block text-sm font-semibold mb-2"
                    style={{ color: "#365766" }}
                  >
                    Status
                  </label>
                  <div
                    className="w-full px-4 py-3 rounded-xl border font-semibold"
                    style={{
                      borderColor: "#D9EAF0",
                      backgroundColor: "#F7FBFC",
                      color:
                        patient.status === "consulting"
                          ? "#3F8EAC"
                          : "#173B4D",
                    }}
                  >
                    {statusLabel}
                  </div>
                </div>
              </div>

              {(patient.status === "waiting" || patient.status === "consulting") && (
                <div
                  className="mt-8 rounded-2xl p-8 text-center border"
                  style={{
                    backgroundColor: "#F3FAFC",
                    borderColor: "#B9DDE8",
                  }}
                >
                <p
                  className="text-sm font-semibold mb-2"
                  style={{ color: "#3F8EAC" }}
                >
                  Live Waiting Time
                </p>

                <div
                  className="text-5xl font-bold"
                  style={{ color: "#3F8EAC" }}
                >
                  {liveWait}
                </div>

                <p
                  className="mt-2 font-medium"
                  style={{ color: "#365766" }}
                >
                  minutes
                </p>

                <p
                  className="mt-4 text-sm font-semibold"
                  style={{ color: "#5A7A8A" }}
                >
                  Estimated wait: {Math.round(Number(patient.predicted_wait_time ?? 0))} min
                </p>

                <p
                  className="text-sm mt-2"
                  style={{ color: "#7A929E" }}
                >
                  
                </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ETAPage() {
  const [queueData, setQueueData] = useState<any>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [doctorsData, setDoctorsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadETAData = async () => {
      try {
        const [queueResponse, analyticsResponse, doctorsResponse] =
          await Promise.all([
            fetch("http://127.0.0.1:5000/queue"),
            fetch("http://127.0.0.1:5000/analytics"),
            fetch("http://127.0.0.1:5000/doctors")
          ]);

        if (!queueResponse.ok || !analyticsResponse.ok || !doctorsResponse.ok) {
          throw new Error("Failed to load ETA data");
        }

        const [queue, analytics, doctors] = await Promise.all([
          queueResponse.json(),
          analyticsResponse.json(),
          doctorsResponse.json()
        ]);

        setQueueData(queue);
        setAnalyticsData(analytics);
        setDoctorsData(doctors);
      } catch (error) {
        console.error("Failed to load ETA data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadETAData();

    const interval = setInterval(loadETAData, 5000);
    return () => clearInterval(interval);
  }, []);

  const queue = queueData?.queue ?? [];
  const waitingPatients = queue.filter(
    (patient: any) => patient.status === "waiting"
  );

  const queueLength = Number(queueData?.waiting_count ?? waitingPatients.length);

  const serviceTimes = Object.values(
    queueData?.service_time_minutes ?? {}
  ) as number[];

  const avgConsultation = serviceTimes.length
    ? Math.round(
        serviceTimes.reduce((sum, value) => sum + Number(value), 0) /
          serviceTimes.length
      )
    : 0;

  const predictedWait =
    waitingPatients.length > 0
      ? Number(waitingPatients[0].live_eta_minutes ?? 0)
      : 0;

  const availableDoctors = doctorsData.filter(
    (doctor: any) => doctor.status === "Available"
  ).length;

  const activeDoctors = doctorsData.filter(
    (doctor: any) => doctor.status === "Busy"
  ).length;

  const doctorLoad =
    availableDoctors + activeDoctors > 0
      ? queueLength / (availableDoctors + activeDoctors)
      : queueLength;

  let congestionLevel = "Clear";
  let congestionColor = "#22c55e";

  if (doctorLoad > 2) {
    congestionLevel = "High";
    congestionColor = "#B74A42";
  } else if (doctorLoad > 1) {
    congestionLevel = "Moderate";
    congestionColor = "#F59E0B";
  }

  const hourlyVolume = analyticsData?.hourly_volume ?? [];

  const peakHour = analyticsData?.peak_hour ?? "—";
  const emergencyCases = Number(analyticsData?.emergency_cases ?? 0);
  const completedPatients = Number(
    analyticsData?.completed_patients_today ?? 0
  );

  const insights = [
    {
      text:
        queueLength > 0
          ? `${queueLength} patient${queueLength === 1 ? "" : "s"} currently waiting across the active queue.`
          : "No patients are currently waiting in the active queue.",
      good: queueLength <= 5
    },
    {
      text:
        completedPatients > 0
          ? `${completedPatients} patient${completedPatients === 1 ? "" : "s"} completed today.`
          : "No patients have completed consultation today yet.",
      good: true
    },
    {
      text:
        peakHour !== "—"
          ? `Today's highest patient traffic was recorded around ${peakHour}.`
          : "Peak traffic information is not available yet.",
      good: true
    },
    {
      text:
        emergencyCases > 0
          ? `${emergencyCases} emergency case${emergencyCases === 1 ? "" : "s"} recorded today.`
          : "No emergency cases have been recorded today.",
      good: emergencyCases === 0
    }
  ];

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: "#DDEEF8" }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1" style={{ color: "#283040" }}>
            Analytics & ETA
          </h1>
          <p className="text-sm" style={{ color: "#7FB0CB" }}>
            Live queue monitoring and hospital performance analysis
          </p>
        </div>

        {/* Prediction Model */}
        <GlassCard
          className="p-6 mb-6"
          style={{
            background:
              "linear-gradient(135deg, rgba(63,142,172,0.07), rgba(168,205,229,0.12))"
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: "#3F8EAC" }}
              >
                <Brain size={28} className="text-white" />
              </div>
              <div>
                <div
                  className="font-black text-xl"
                  style={{ color: "#283040" }}
                >
                  Wait-Time Prediction Model
                </div>
                <div
                  className="text-sm mt-0.5"
                  style={{ color: "#5a7a8a" }}
                >
                  Linear regression model using patient and queue characteristics
                </div>
              </div>
            </div>

            <div className="md:ml-auto text-left md:text-right">
              <div
                className="text-4xl font-black"
                style={{ color: "#3F8EAC" }}
              >
                27.8 min
              </div>
              <div className="text-sm" style={{ color: "#7FB0CB" }}>
                average prediction error
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          {[
            {
              label: "Queue Length Now",
              value: loading ? "—" : String(queueLength),
              sub: "waiting patients",
              icon: Users,
              color: "#3F8EAC"
            },
            {
              label: "Avg Consultation",
              value: loading ? "—" : String(avgConsultation),
              sub: "historical minutes",
              icon: Clock,
              color: "#7FB0CB"
            },
            {
              label: "Predicted Wait",
              value: loading ? "—" : String(predictedWait),
              sub: "next patient · minutes",
              icon: Timer,
              color: "#B74A42"
            },
            {
              label: "Queue Status",
              value: loading ? "—" : congestionLevel,
              sub: `${availableDoctors} doctors available`,
              icon: Activity,
              color: congestionColor
            }
          ].map(m => (
            <GlassCard key={m.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p
                    className="text-xs font-medium"
                    style={{ color: "#5a7a8a" }}
                  >
                    {m.label}
                  </p>
                  <p
                    className="text-3xl font-black mt-1"
                    style={{ color: "#283040" }}
                  >
                    {m.value}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: m.color }}
                  >
                    {m.sub}
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: m.color + "15" }}
                >
                  <m.icon size={20} style={{ color: m.color }} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Patient Arrival Trend */}
          <GlassCard className="p-6 lg:col-span-2">
            <h3 className="font-bold mb-5" style={{ color: "#283040" }}>
              Patient Arrival Trend
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={hourlyVolume}>
                <defs>
                  <linearGradient id="qg" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="#3F8EAC"
                      stopOpacity={0.22}
                    />
                    <stop
                      offset="95%"
                      stopColor="#3F8EAC"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(168,205,229,0.35)"
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11, fill: "#7FB0CB" }}
                />
                <YAxis
                  allowDecimals={false}
                  domain={[0, "dataMax + 1"]}
                  tick={{ fontSize: 11, fill: "#7FB0CB" }}
                />
                <Tooltip contentStyle={ttStyle} />
                <Area
                  type="monotone"
                  dataKey="patients"
                  stroke="#3F8EAC"
                  strokeWidth={2.5}
                  fill="url(#qg)"
                  name="Patients"
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Operational Insights */}
          <GlassCard className="p-6">
            <h3 className="font-bold mb-4" style={{ color: "#283040" }}>
              Operational Insights
            </h3>
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{
                    backgroundColor: ins.good
                      ? "rgba(63,142,172,0.07)"
                      : "rgba(183,74,66,0.06)"
                  }}
                >
                  <TrendingUp
                    size={13}
                    style={{
                      color: ins.good ? "#3F8EAC" : "#B74A42",
                      flexShrink: 0,
                      marginTop: 2
                    }}
                  />
                  <span
                    className="text-xs leading-relaxed"
                    style={{ color: "#283040" }}
                  >
                    {ins.text}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

      </div>
    </div>
  );
}

// ─── Multi-Doctor Queue View ──────────────────────────────────────────────────

function DoctorsPage({ patients }: { patients: Patient[] }) {
  type DbDoctor = {
    doctor_id: string;
    doctor_name: string;
    department: string;
    specialization: string;
    status: string;
    waiting_patients: number;
  };

  const [doctors, setDoctors] = useState<DbDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/doctors");

        if (!response.ok) {
          throw new Error("Failed to load doctors");
        }

        const data = await response.json();
        setDoctors(data);
      } catch (err) {
        setError("Unable to load doctor information from the server.");
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();

    const interval = setInterval(loadDoctors, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    if (status === "Available") return "#16a34a";
    if (status === "Busy") return "#D97706";
    return "#B74A42";
  };

  const getInitials = (name: string) => {
    const words = name.replace("Dr.", "").trim().split(/\s+/);
    return words
      .slice(0, 2)
      .map(word => word[0])
      .join("")
      .toUpperCase();
  };

  const statusCounts = [
    {
      name: "Available",
      count: doctors.filter(d => d.status === "Available").length,
    },
    {
      name: "Busy",
      count: doctors.filter(d => d.status === "Busy").length,
    },
    {
      name: "On Leave",
      count: doctors.filter(d => d.status === "On Leave").length,
    },
  ];

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: "#DDEEF8" }}>
      <div className="max-w-7xl mx-auto">

        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1" style={{ color: "#283040" }}>
            Doctors
          </h1>
          <p className="text-sm" style={{ color: "#7FB0CB" }}>
            Doctor information loaded from the hospital database
          </p>
        </div>

        {loading && (
          <GlassCard className="p-6">
            <p className="text-sm" style={{ color: "#5a7a8a" }}>
              Loading doctor information...
            </p>
          </GlassCard>
        )}

        {error && (
          <GlassCard className="p-6">
            <p className="text-sm font-semibold" style={{ color: "#B74A42" }}>
              {error}
            </p>
          </GlassCard>
        )}

        {!loading && !error && (
          <>
            <div className="mb-6">
              <div className="text-sm font-semibold" style={{ color: "#5a7a8a" }}>
                Total Doctors: {doctors.length}
              </div>
            </div>

            <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-6 mb-8">
              {doctors.map(doc => {
                

                return (
                  <GlassCard
                    key={doc.doctor_id}
                    className="p-6 hover:shadow-xl transition-all"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                        style={{ backgroundColor: "#3F8EAC" }}
                      >
                        {getInitials(doc.doctor_name)}
                      </div>

                      <div>
                        <div
                          className="font-black text-lg"
                          style={{ color: "#283040" }}
                        >
                          {doc.doctor_name}
                        </div>

                        <div
                          className="text-xs font-semibold"
                          style={{ color: "#7FB0CB" }}
                        >
                          {doc.doctor_id}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mb-5">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: getStatusColor(doc.status),
                        }}
                      />

                      <span
                        className="text-sm font-semibold"
                        style={{
                          color: getStatusColor(doc.status),
                        }}
                      >
                        {doc.status}
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: "rgba(168,205,229,0.15)" }}
                      >
                        <div
                          className="text-xs mb-1"
                          style={{ color: "#5a7a8a" }}
                        >
                          Department
                        </div>

                        <div
                          className="text-sm font-bold"
                          style={{ color: "#283040" }}
                        >
                          {doc.department}
                        </div>
                      </div>

                      <div
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: "rgba(168,205,229,0.15)" }}
                      >
                        <div
                          className="text-xs mb-1"
                          style={{ color: "#5a7a8a" }}
                        >
                          Specialization
                        </div>

                        <div
                          className="text-sm font-bold"
                          style={{ color: "#283040" }}
                        >
                          {doc.specialization}
                        </div>
                      </div>

                      <div
                        className="p-3 rounded-xl"
                        style={{ backgroundColor: "rgba(168,205,229,0.15)" }}
                      >
                        <div
                          className="text-xs mb-1"
                          style={{ color: "#5a7a8a" }}
                        >
                          Waiting Patients
                        </div>

                        <div
                          className="text-xl font-black"
                          style={{ color: "#283040" }}
                        >
                          {doc.waiting_patients}
                        </div>
                      </div>
                    </div>
                  </GlassCard>
                );
              })}
            </div>

            <GlassCard className="p-6">
              <h3 className="font-bold mb-5" style={{ color: "#283040" }}>
                Doctor Status Overview
              </h3>

              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={statusCounts}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(168,205,229,0.35)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#7FB0CB" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#7FB0CB" }}
                  />
                  <Tooltip contentStyle={ttStyle} />
                  <Bar
                    dataKey="count"
                    fill="#3F8EAC"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Analytics Dashboard ──────────────────────────────────────────────────────

function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/analytics");

      if (!response.ok) {
        throw new Error("Failed to load analytics");
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error("Failed to load analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();

    const interval = setInterval(loadAnalytics, 5000);

    return () => clearInterval(interval);
  }, []);

  const metrics = [
    {
      label: "Total Patients Today",
      value: analytics ? analytics.total_patients_today : "—",
      change: analytics
        ? `${analytics.waiting_patients} currently waiting`
        : "Loading...",
      good: true,
      icon: Users,
      color: "#3F8EAC"
    },
    {
      label: "Average Wait Time",
      value: analytics ? `${analytics.average_wait_time} min` : "—",
      change: "Based on completed consultations",
      good: true,
      icon: Clock,
      color: "#7FB0CB"
    },
    {
      label: "Queue Efficiency",
      value: analytics ? `${analytics.queue_efficiency}%` : "—",
      change: analytics
        ? `${analytics.completed_patients_today} patients served`
        : "Loading...",
      good: true,
      icon: Zap,
      color: "#22c55e"
    },
    {
      label: "Peak Hour",
      value: analytics ? analytics.peak_hour : "—",
      change: "Highest patient traffic",
      good: false,
      icon: Activity,
      color: "#B74A42"
    },
    {
      label: "Patients Served",
      value: analytics ? analytics.completed_patients_today : "—",
      change: "Completed consultations today",
      good: true,
      icon: Users,
      color: "#22c55e"
    },
    {
      label: "Emergency Cases",
      value: analytics ? analytics.emergency_cases : "—",
      change: "Recorded today",
      good: false,
      icon: Shield,
      color: "#B74A42"
    }
  ];

  const weeklyTrend = analytics?.weekly_trend ?? [];
  const patientsByDepartment = analytics?.patients_by_department ?? [];
  const patientsByPriority = analytics?.patients_by_priority ?? [];
  const averageWaitByDepartment = analytics?.average_wait_by_department ?? [];

  const durationRanges = [
    "< 10 min",
    "10–15 min",
    "15–20 min",
    "> 20 min"
  ];

  const durationDist = durationRanges.map((name) => {
    const match = (analytics?.duration_distribution ?? []).find(
      (item: { name?: string; duration_range?: string }) =>
        (item.name ?? item.duration_range) === name
    );

    return {
      name,
      value: Number(match?.value ?? match?.percentage ?? 0)
    };
  });

  const exportAnalytics = () => {
    if (!analytics) return;

    const patientRecords = analytics.patient_records ?? [];

    const rows = [
      ["HOSPITAL QUEUE MANAGEMENT - DAILY REPORT"],
      [],
      ["SUMMARY"],
      ["Metric", "Value"],
      ["Report Date", new Date().toLocaleDateString("en-IN")],
      ["Total Patients", analytics.total_patients_today],
      ["Patients Served", analytics.completed_patients_today],
      ["Patients Waiting", analytics.waiting_patients],
      ["Patients Consulting", analytics.consulting_patients],
      ["Average Wait Time (min)", analytics.average_wait_time],
      ["Queue Efficiency (%)", analytics.queue_efficiency],
      ["Peak Hour", analytics.peak_hour],
      ["Emergency Cases", analytics.emergency_cases],
      [],
      ["PATIENT REGISTRATION & CONSULTATION DETAILS"],
      [
        "Token",
        "Patient Name",
        "Age",
        "Condition",
        "Department",
        "Doctor",
        "Triage Category",
        "Emergency",
        "Estimated Wait (min)",
        "Actual Wait (min)",
        "Status",
        "Registered At",
        "Consultation Started At"
      ],
      ...patientRecords.map((patient: any) => [
        patient.token,
        patient.patient_name,
        patient.age,
        patient.condition,
        patient.department,
        patient.doctor,
        patient.triage_category,
        patient.emergency,
        patient.predicted_wait_time,
        patient.actual_wait_time ?? "",
        patient.status,
        patient.registered_at,
        patient.consulting_started_at
      ]),
      [],
      ["HOURLY PATIENT TRAFFIC"],
      ["Time", "Patients"],
      ...(analytics.hourly_volume ?? []).map((item: any) => [
        item.time,
        item.patients
      ]),
      [],
      ["WEEKLY PATIENT VOLUME"],
      ["Day", "Patients", "Efficiency (%)"],
      ...weeklyTrend.map((item: any) => [
        item.day,
        item.patients,
        item.efficiency
      ]),
      [],
      ["CONSULTATION DURATION DISTRIBUTION (HISTORICAL DATA)"],
      ["Duration", "Percentage (%)"],
      ...durationDist.map((item: any) => [
        item.name,
        item.value
      ])
    ];

    const csv = rows
      .map(row =>
        row
          .map(value => {
            const cell = String(value ?? "");
            return `"${cell.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      ["\uFEFF" + csv],
      { type: "text/csv;charset=utf-8;" }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `hospital-queue-daily-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: "#DDEEF8" }}>
      <div className="max-w-7xl mx-auto">
        {loading && !analytics ? (
          <GlassCard className="p-8 mb-7">
            <div className="text-center" style={{ color: "#5a7a8a" }}>
              Loading analytics...
            </div>
          </GlassCard>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-black" style={{ color: "#283040" }}>
                  Analytics Summary
                </h2>
                <p className="text-sm mt-1" style={{ color: "#7FB0CB" }}>
                  Live performance metrics from today's queue
                </p>
              </div>

              <button
                onClick={exportAnalytics}
                disabled={!analytics}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#3F8EAC" }}
              >
                <Download size={16} /> Export Report
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
              {metrics.map(m => (
                <GlassCard key={m.label} className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium" style={{ color: "#5a7a8a" }}>
                        {m.label}
                      </p>
                      <p className="text-3xl font-black mt-1" style={{ color: "#283040" }}>
                        {m.value}
                      </p>
                      <p
                        className="text-xs mt-1 font-medium"
                        style={{ color: m.good ? "#22c55e" : "#B74A42" }}
                      >
                        {m.change}
                      </p>
                    </div>

                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: m.color + "15" }}
                    >
                      <m.icon size={20} style={{ color: m.color }} />
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <GlassCard className="p-6">
                <h3 className="font-bold mb-5" style={{ color: "#283040" }}>
                  Patients by Department
                </h3>

                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={patientsByDepartment}
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(168,205,229,0.35)"
                    />

                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: "#7FB0CB" }}
                    />

                    <YAxis
                      type="category"
                      dataKey="name"
                      width={105}
                      tick={{ fontSize: 10, fill: "#7FB0CB" }}
                    />

                    <Tooltip
                      contentStyle={ttStyle}
                      formatter={(value: number) => [value, "Patients"]}
                    />

                    <Bar
                      dataKey="patients"
                      fill="#3F8EAC"
                      radius={[0, 6, 6, 0]}
                      name="Patients"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="font-bold mb-5" style={{ color: "#283040" }}>
                  Patients by Priority
                </h3>

                <ResponsiveContainer width="100%" height={300}>
                  <RePieChart>
                    <Pie
                      data={patientsByPriority}
                      dataKey="patients"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={105}
                      paddingAngle={2}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {patientsByPriority.map((_: any, index: number) => (
                        <Cell
                          key={`priority-${index}`}
                          fill={
                            [
                              "#B74A42",
                              "#D08A52",
                              "#E1B95A",
                              "#7FB0CB",
                              "#3F8EAC"
                            ][index % 5]
                          }
                        />
                      ))}
                    </Pie>

                    <Tooltip
                      contentStyle={ttStyle}
                      formatter={(value: number) => [value, "Patients"]}
                    />
                  </RePieChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>

            <GlassCard className="p-6 mb-6">
              <h3 className="font-bold mb-5" style={{ color: "#283040" }}>
                Average Wait Time by Department
              </h3>

              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={averageWaitByDepartment}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(168,205,229,0.35)"
                  />

                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#7FB0CB" }}
                    label={{
                      value: "Minutes",
                      position: "insideBottom",
                      offset: -2,
                      style: { fill: "#7FB0CB", fontSize: 11 }
                    }}
                  />

                  <YAxis
                    type="category"
                    dataKey="name"
                    width={105}
                    tick={{ fontSize: 10, fill: "#7FB0CB" }}
                  />

                  <Tooltip
                    contentStyle={ttStyle}
                    formatter={(value: number) => [`${value} min`, "Average Wait"]}
                  />

                  <Bar
                    dataKey="average_wait"
                    fill="#B74A42"
                    radius={[0, 6, 6, 0]}
                    name="Average Wait"
                  />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              <GlassCard className="p-6">
                <h3 className="font-bold mb-5" style={{ color: "#283040" }}>
                  Weekly Patient Volume
                </h3>

                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={weeklyTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(168,205,229,0.35)"
                    />

                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "#7FB0CB" }}
                    />

                    <YAxis
                      allowDecimals={false}
                      domain={[0, "dataMax + 1"]}
                      tick={{ fontSize: 11, fill: "#7FB0CB" }}
                      label={{
                        value: "Patients",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "#7FB0CB", fontSize: 11 }
                      }}
                    />

                    <Tooltip
                      contentStyle={ttStyle}
                      formatter={(value: number) => [value, "Patients"]}
                    />

                    <Line
                      type="monotone"
                      dataKey="patients"
                      stroke="#3F8EAC"
                      strokeWidth={2.5}
                      dot={{ fill: "#3F8EAC", r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Patients"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <GlassCard className="p-6 lg:col-span-2">
                <h3 className="font-bold mb-5" style={{ color: "#283040" }}>
                  Queue Performance &amp; Efficiency (Weekly)
                </h3>

                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={weeklyTrend}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(168,205,229,0.35)"
                    />

                    <XAxis
                      dataKey="day"
                      tick={{ fontSize: 11, fill: "#7FB0CB" }}
                    />

                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 11, fill: "#7FB0CB" }}
                      tickFormatter={(value) => `${value}%`}
                    />

                    <Tooltip
                      contentStyle={ttStyle}
                      formatter={(value: number) => [`${value}%`, "Efficiency"]}
                    />

                    <Line
                      type="monotone"
                      dataKey="efficiency"
                      stroke="#3F8EAC"
                      strokeWidth={2.5}
                      dot={{ fill: "#3F8EAC", r: 4 }}
                      name="Efficiency"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </GlassCard>

              <GlassCard className="p-6">
                <h3 className="font-bold mb-4" style={{ color: "#283040" }}>
                  Consultation Duration (Today)
                </h3>

                <ResponsiveContainer width="100%" height={160}>
                  <RePieChart>
                    {durationDist.some((item) => item.value > 0) ? (
                      <>
                        <Pie
                          data={durationDist.filter((item) => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          outerRadius={68}
                          dataKey="value"
                          strokeWidth={0}
                        >
                          {durationDist
                            .filter((item) => item.value > 0)
                            .map((e) => {
                              const index = durationDist.findIndex(
                                (item) => item.name === e.name
                              );

                              return (
                                <Cell
                                  key={e.name}
                                  fill={
                                    ["#3F8EAC", "#7FB0CB", "#A8CDE5", "#B74A42"][
                                      index % 4
                                    ]
                                  }
                                />
                              );
                            })}
                        </Pie>

                        <Tooltip contentStyle={ttStyle} />
                      </>
                    ) : (
                      <text
                        x="50%"
                        y="50%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#7FB0CB"
                        fontSize={12}
                      >
                        No completed consultations
                      </text>
                    )}
                  </RePieChart>
                </ResponsiveContainer>

                <div className="mt-3 space-y-2">
                  {durationDist.map((d, i) => (
                    <div
                      key={d.name}
                      className="flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor:
                              ["#3F8EAC", "#7FB0CB", "#A8CDE5", "#B74A42"][i % 4]
                          }}
                        />
                        <span style={{ color: "#283040" }}>{d.name}</span>
                      </div>

                      <span
                        className="font-bold"
                        style={{ color: "#283040" }}
                      >
                        {d.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function NavBar({ current, onNav }: { current: Page; onNav: (p: Page) => void }) {
  const [open, setOpen] = useState(false);

  const pages: { id: Page; label: string; Icon: React.ElementType }[] = [
    { id: "landing", label: "Home", Icon: Home },
    { id: "reception", label: "Reception", Icon: LayoutDashboard },
    { id: "patient", label: "My Queue", Icon: QrCode },
    { id: "eta", label: "Analytics & ETA", Icon: Brain },
    { id: "doctors", label: "Doctors", Icon: Stethoscope },
  ];

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/85 backdrop-blur-md border-b border-[#A8CDE5]/30">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={() => onNav("landing")} className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#3F8EAC" }}>
            <Heart size={14} className="text-white" />
          </div>
          <span className="font-black text-lg" style={{ color: "#283040" }}>Hospital Queue Management</span>
        </button>

        <div className="hidden md:flex items-center gap-1">
          {pages.map(p => (
            <button
              key={p.id}
              onClick={() => onNav(p.id)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
              style={current === p.id ? { backgroundColor: "#3F8EAC", color: "white" } : { color: "#5a7a8a" }}
            >
              <p.Icon size={15} />
              {p.label}
            </button>
          ))}
        </div>

        <button className="md:hidden p-2" onClick={() => setOpen(o => !o)}>
          {open ? <X size={22} style={{ color: "#283040" }} /> : <Menu size={22} style={{ color: "#283040" }} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#A8CDE5]/20 bg-white/90 backdrop-blur-md px-4 pb-4 pt-2">
          {pages.map(p => (
            <button key={p.id} onClick={() => { onNav(p.id); setOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all mb-1" style={current === p.id ? { backgroundColor: "#3F8EAC", color: "white" } : { color: "#5a7a8a" }}>
              <p.Icon size={16} /> {p.label}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    fetch("http://127.0.0.1:5000/patients")
      .then(res => {
        if (!res.ok) {
          throw new Error("Failed to load patients");
        }
        return res.json();
      })
      .then(data => {
        const loadedPatients: Patient[] = data.map((p: any) => ({
          token: p.token,
          name: p.patient_name,
          doctor: p.doctor_name || p.doctor_id || "Unassigned",
          department: p.department || "General",
          status: p.status as PatientStatus,
          eta: p.status === "consulting"
            ? "Now"
            : `${p.predicted_wait_time ?? 0} min`,
          isEmergency: Boolean(p.is_emergency),
          waitMinutes: p.predicted_wait_time ?? 0,
          condition: p.condition_name || "General",
          phone: p.phone || "",
          age: p.age || 0,
          registeredAt: p.registered_at
            ? new Date(p.registered_at).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit"
              })
            : "",
        }));

        setPatients(loadedPatients);
      })
      .catch(error => {
        console.error("Failed to load patients:", error);
      });
  }, []);

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      {page !== "landing" && <NavBar current={page} onNav={setPage} />}
      <div className={page !== "landing" ? "pt-16" : ""}>
        {page === "landing" && <LandingPage onNav={setPage} />}
        {page === "reception" && <ReceptionPage patients={patients} setPatients={setPatients} />}
        {page === "patient" && <PatientPage />}
        {page === "eta" && (
          <>
            <ETAPage />
            <AnalyticsPage />
          </>
        )}
        {page === "doctors" && <DoctorsPage patients={patients} />}
      </div>
    </div>
  );
}
