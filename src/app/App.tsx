import { useState, useEffect } from "react";
import {
  Users, Clock, Activity, Bell, Search, CheckCircle,
  AlertTriangle, ArrowRight, Star, TrendingUp, Zap, Shield,
  Heart, Stethoscope, Brain, Timer, QrCode,
  SkipForward, UserPlus, Volume2, Download,
  Menu, X, BarChart2, Check, Home, LayoutDashboard,
  Wifi,
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
  token: string;
  name: string;
  doctor: string;
  status: PatientStatus;
  eta: string;
  isEmergency: boolean;
  waitMinutes: number;
  condition: string;
  phone: string;
  age: number;
  registeredAt: string;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
const INITIAL_PATIENTS: Patient[] = [
  { token: "T001", name: "Priya Sharma", doctor: "Dr. Mehta", status: "consulting", eta: "Now", isEmergency: false, waitMinutes: 0, condition: "Fever & Cold", phone: "+91 98765 43210", age: 34, registeredAt: "09:15 AM" },
  { token: "T002", name: "Rajesh Kumar", doctor: "Dr. Sharma", status: "waiting", eta: "18 min", isEmergency: true, waitMinutes: 18, condition: "Chest Pain", phone: "+91 87654 32109", age: 58, registeredAt: "09:22 AM" },
  { token: "T003", name: "Anita Patel", doctor: "Dr. Patel", status: "waiting", eta: "15 min", isEmergency: false, waitMinutes: 15, condition: "Knee Pain", phone: "+91 76543 21098", age: 45, registeredAt: "09:30 AM" },
  { token: "T004", name: "Vikram Singh", doctor: "Dr. Mehta", status: "waiting", eta: "25 min", isEmergency: false, waitMinutes: 25, condition: "Back Pain", phone: "+91 65432 10987", age: 29, registeredAt: "09:35 AM" },
  { token: "T005", name: "Sunita Rao", doctor: "Dr. Sharma", status: "waiting", eta: "35 min", isEmergency: false, waitMinutes: 35, condition: "High BP", phone: "+91 54321 09876", age: 52, registeredAt: "09:40 AM" },
  { token: "T006", name: "Arjun Nair", doctor: "Dr. Patel", status: "waiting", eta: "30 min", isEmergency: false, waitMinutes: 30, condition: "Ankle Sprain", phone: "+91 43210 98765", age: 38, registeredAt: "09:45 AM" },
  { token: "T007", name: "Meena Krishnan", doctor: "Dr. Mehta", status: "waiting", eta: "40 min", isEmergency: false, waitMinutes: 40, condition: "Diabetes Review", phone: "+91 32109 87654", age: 61, registeredAt: "09:50 AM" },
  { token: "T008", name: "Suresh Gupta", doctor: "Dr. Sharma", status: "waiting", eta: "52 min", isEmergency: false, waitMinutes: 52, condition: "Palpitations", phone: "+91 21098 76543", age: 44, registeredAt: "09:55 AM" },
  { token: "T009", name: "Kavitha Menon", doctor: "Dr. Patel", status: "waiting", eta: "45 min", isEmergency: false, waitMinutes: 45, condition: "Shoulder Pain", phone: "+91 10987 65432", age: 33, registeredAt: "10:00 AM" },
  { token: "T010", name: "Deepak Joshi", doctor: "Dr. Mehta", status: "waiting", eta: "55 min", isEmergency: false, waitMinutes: 55, condition: "Headache", phone: "+91 09876 54321", age: 27, registeredAt: "10:05 AM" },
  { token: "T011", name: "Rekha Nair", doctor: "Dr. Sharma", status: "waiting", eta: "65 min", isEmergency: false, waitMinutes: 65, condition: "Thyroid Review", phone: "+91 11111 22222", age: 49, registeredAt: "10:10 AM" },
  { token: "T012", name: "Mohan Pillai", doctor: "Dr. Patel", status: "waiting", eta: "60 min", isEmergency: false, waitMinutes: 60, condition: "Hip Pain", phone: "+91 22222 33333", age: 67, registeredAt: "10:12 AM" },
];

const COMPLETED_TODAY = [
  { token: "C001", name: "Rohit Verma", doctor: "Dr. Mehta", duration: "11 min", at: "08:45 AM" },
  { token: "C002", name: "Lakshmi Iyer", doctor: "Dr. Sharma", duration: "19 min", at: "08:52 AM" },
  { token: "C003", name: "Prakash Reddy", doctor: "Dr. Patel", duration: "14 min", at: "09:05 AM" },
  { token: "C004", name: "Divya Nambiar", doctor: "Dr. Mehta", duration: "10 min", at: "09:14 AM" },
  { token: "C005", name: "Kiran Bhat", doctor: "Dr. Sharma", duration: "22 min", at: "09:21 AM" },
  { token: "C006", name: "Smita Kulkarni", doctor: "Dr. Patel", duration: "13 min", at: "09:33 AM" },
  { token: "C007", name: "Mohan Das", doctor: "Dr. Mehta", duration: "9 min", at: "09:42 AM" },
  { token: "C008", name: "Padmini Sinha", doctor: "Dr. Sharma", duration: "17 min", at: "09:58 AM" },
];

const DOCTORS_INFO = [
  { name: "Dr. Mehta", specialty: "General Medicine", initials: "RM", color: "#3F8EAC", avgTime: 12, today: 18, status: "Consulting" },
  { name: "Dr. Sharma", specialty: "Cardiology", initials: "AS", color: "#7FB0CB", avgTime: 18, today: 14, status: "Available" },
  { name: "Dr. Patel", specialty: "Orthopedics", initials: "VP", color: "#B74A42", avgTime: 15, today: 12, status: "Available" },
];

// ─── Chart Data ───────────────────────────────────────────────────────────────
const hourlyVolume = [
  { time: "8AM", patients: 4, wait: 8 }, { time: "9AM", patients: 8, wait: 14 },
  { time: "10AM", patients: 12, wait: 23 }, { time: "11AM", patients: 15, wait: 31 },
  { time: "12PM", patients: 9, wait: 19 }, { time: "1PM", patients: 6, wait: 12 },
  { time: "2PM", patients: 11, wait: 22 }, { time: "3PM", patients: 14, wait: 28 },
  { time: "4PM", patients: 10, wait: 20 }, { time: "5PM", patients: 7, wait: 15 },
];

const weeklyTrend = [
  { day: "Mon", patients: 42, efficiency: 87 }, { day: "Tue", patients: 38, efficiency: 91 },
  { day: "Wed", patients: 55, efficiency: 82 }, { day: "Thu", patients: 48, efficiency: 89 },
  { day: "Fri", patients: 61, efficiency: 85 }, { day: "Sat", patients: 72, efficiency: 78 },
  { day: "Sun", patients: 29, efficiency: 94 },
];

const queueTrend = [
  { t: "8:00", q: 2 }, { t: "8:30", q: 5 }, { t: "9:00", q: 8 }, { t: "9:30", q: 11 },
  { t: "10:00", q: 14 }, { t: "10:30", q: 12 }, { t: "11:00", q: 9 }, { t: "11:30", q: 7 }, { t: "12:00", q: 5 },
];

const durationDist = [
  { name: "< 10 min", value: 23, color: "#3F8EAC" },
  { name: "10–15 min", value: 41, color: "#7FB0CB" },
  { name: "15–20 min", value: 28, color: "#A8CDE5" },
  { name: "> 20 min", value: 8, color: "#B74A42" },
];

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
  const [showModal, setShowModal] = useState(false);
  const [notif, setNotif] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", doctor: "Dr. Mehta", condition: "", phone: "", age: "", isEmergency: false });

  const waiting = patients.filter(p => p.status === "waiting").length;
  const consulting = patients.filter(p => p.status === "consulting").length;
  const completedNow = patients.filter(p => p.status === "completed").length;
  const avgWait = waiting > 0 ? Math.round(patients.filter(p => p.status === "waiting").reduce((a, p) => a + p.waitMinutes, 0) / waiting) : 0;

  const toast = (msg: string) => { setNotif(msg); setTimeout(() => setNotif(null), 3000); };

  const callNext = () => {
    setPatients(prev => {
      const emergency = prev.find(p => p.status === "waiting" && p.isEmergency);
      const next = emergency || prev.find(p => p.status === "waiting");
      if (!next) { toast("No patients waiting."); return prev; }
      toast(`${next.name} (${next.token}) has been called.`);
      return prev.map(p => p.token === next.token ? { ...p, status: "consulting" as PatientStatus, eta: "Now" } : p);
    });
  };

  const complete = (token: string) => {
    setPatients(prev => prev.map(p => p.token === token ? { ...p, status: "completed" as PatientStatus } : p));
    toast("Consultation completed.");
  };

  const skip = (token: string) => {
    setPatients(prev => {
      const idx = prev.findIndex(p => p.token === token);
      if (idx === -1) return prev;
      const copy = [...prev];
      const [patient] = copy.splice(idx, 1);
      const insertAt = copy.findLastIndex(p => p.status === "waiting");
      copy.splice(insertAt + 1, 0, patient);
      toast(`${patient.name} moved to end of queue.`);
      return copy;
    });
  };

  const markEmergency = (token: string) => {
    setPatients(prev => {
      const updated = prev.map(p => p.token === token ? { ...p, isEmergency: !p.isEmergency } : p);
      return [
        ...updated.filter(p => p.status === "consulting"),
        ...updated.filter(p => p.status === "waiting" && p.isEmergency),
        ...updated.filter(p => p.status === "waiting" && !p.isEmergency),
        ...updated.filter(p => p.status === "completed"),
      ];
    });
    toast("Priority updated.");
  };

  const register = () => {
    if (!form.name.trim()) return;
    const token = `T${String(patients.length + 1).padStart(3, "0")}`;
    const newP: Patient = {
      token, name: form.name, doctor: form.doctor, status: "waiting",
      eta: `${avgWait + 12} min`, isEmergency: form.isEmergency,
      waitMinutes: avgWait + 12, condition: form.condition || "General",
      phone: form.phone, age: parseInt(form.age) || 0,
      registeredAt: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    };
    setPatients(prev => form.isEmergency ? [prev[0], newP, ...prev.slice(1)] : [...prev, newP]);
    setForm({ name: "", doctor: "Dr. Mehta", condition: "", phone: "", age: "", isEmergency: false });
    setShowModal(false);
    toast(`Token ${token} issued to ${form.name}.`);
  };

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    return (p.name.toLowerCase().includes(q) || p.token.toLowerCase().includes(q)) &&
      (filter === "all" || p.status === filter);
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
            { label: "Served Today", value: COMPLETED_TODAY.length + completedNow, icon: CheckCircle, color: "#22c55e" },
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
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: "rgba(255,255,255,0.7)", border: "1px solid rgba(168,205,229,0.4)" }}>
            <Search size={15} style={{ color: "#7FB0CB" }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or token…" className="bg-transparent outline-none text-sm w-44" style={{ color: "#283040" }} />
          </div>
        </div>

        {/* Queue Table */}
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(168,205,229,0.3)" }}>
                  {["Token", "Patient", "Doctor", "Condition", "Status", "ETA", "Actions"].map(h => (
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
                      <span className="text-sm font-bold" style={{ color: p.eta === "Now" ? "#3F8EAC" : "#283040" }}>{p.eta}</span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {p.status === "consulting" && (
                          <button onClick={() => complete(p.token)} title="Complete consultation" className="p-1.5 rounded-lg hover:bg-green-50 transition-colors">
                            <CheckCircle size={17} className="text-green-500" />
                          </button>
                        )}
                        {p.status === "waiting" && (
                          <>
                            <button onClick={() => skip(p.token)} title="Skip patient" className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors">
                              <SkipForward size={17} className="text-amber-500" />
                            </button>
                            <button onClick={() => markEmergency(p.token)} title="Toggle emergency" className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
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
                <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "#5a7a8a" }}>Assign Doctor</label>
                <select value={form.doctor} onChange={e => setForm(f => ({ ...f, doctor: e.target.value }))} className="w-full mt-1.5 px-4 py-3 rounded-xl text-sm outline-none" style={{ border: "1.5px solid rgba(168,205,229,0.5)", backgroundColor: "rgba(255,255,255,0.7)", color: "#283040" }}>
                  <option>Dr. Mehta</option>
                  <option>Dr. Sharma</option>
                  <option>Dr. Patel</option>
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
  const [predictionGeneratedAt, setPredictionGeneratedAt] = useState<Date | null>(null);

  const [formData, setFormData] = useState({
    AgeGroup: "Adult (36-60)",
    Department: "Internal Medicine",
    AppointmentType: "New Patient",
    ArrivalMethod: "Walk-in",
    TriageCategory: "Non-urgent",
  });

  const [prediction, setPrediction] = useState<number | null>(null);
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

  const handlePredict = async () => {
    setLoading(true);
    setPrediction(null);
    setError("");

    const predictionTime = new Date();
    setPredictionGeneratedAt(predictionTime);

    const dayNames = [
      "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
    ];

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

    const arrivalHour = predictionTime.getHours();
    const dayOfWeek = dayNames[predictionTime.getDay()];
    const month = monthNames[predictionTime.getMonth()];
    const isWeekend =
      predictionTime.getDay() === 0 ||
      predictionTime.getDay() === 6;

    const facilityOccupancyRate = 0.75;
    const providersOnShift = 10;
    const nursesOnShift = 20;

    const staffToPatientRatio =
      providersOnShift / (providersOnShift + nursesOnShift);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/predict",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            AgeGroup: formData.AgeGroup,
            Department: formData.Department,
            AppointmentType: formData.AppointmentType,
            ArrivalMethod: formData.ArrivalMethod,
            TriageCategory: formData.TriageCategory,
            FacilityOccupancyRate: facilityOccupancyRate,
            ProvidersOnShift: providersOnShift,
            NursesOnShift: nursesOnShift,
            StaffToPatientRatio: staffToPatientRatio,
            ArrivalHour: arrivalHour,
            DayOfWeek: dayOfWeek,
            IsWeekend: isWeekend,
            Month: month,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Unable to predict waiting time."
        );
      }

      setPrediction(data.predicted_wait_time_minutes);
    } catch (err) {
      setError(
        "Unable to connect to the prediction server. Please make sure the Flask backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const updateField = (
    field: keyof typeof formData,
    value: string
  ) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

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
                Predict Your Waiting Time
              </h1>

              <p
                className="mt-1"
                style={{ color: "#5a7a8a" }}
              >
                Enter your visit details to estimate your hospital waiting time.
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

              <p
                className="text-xs mt-1"
                style={{ color: "#7A929E" }}
              >
                Automatically detected
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

              <p
                className="text-xs mt-1"
                style={{ color: "#7A929E" }}
              >
                Updates automatically
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "#365766" }}
              >
                Age Group
              </label>

              <select
                value={formData.AgeGroup}
                onChange={(e) =>
                  updateField("AgeGroup", e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl border outline-none"
                style={{ borderColor: "#C9DEE6" }}
              >
                <option>Adult (36-60)</option>
                <option>Young Adult (18-35)</option>
                <option>Senior (61+)</option>
                <option>Pediatric (0-17)</option>
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "#365766" }}
              >
                Department
              </label>

              <select
                value={formData.Department}
                onChange={(e) =>
                  updateField("Department", e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl border outline-none"
                style={{ borderColor: "#C9DEE6" }}
              >
                <option>Orthopedics</option>
                <option>Cardiology</option>
                <option>General Surgery</option>
                <option>Emergency</option>
                <option>Radiology</option>
                <option>Obstetrics</option>
                <option>Neurology</option>
                <option>Oncology</option>
                <option>Pediatrics</option>
                <option>Internal Medicine</option>
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "#365766" }}
              >
                Appointment Type
              </label>

              <select
                value={formData.AppointmentType}
                onChange={(e) =>
                  updateField("AppointmentType", e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl border outline-none"
                style={{ borderColor: "#C9DEE6" }}
              >
                <option>New Patient</option>
                <option>Specialist Referral</option>
                <option>Urgent Care</option>
                <option>Follow-up</option>
              </select>
            </div>

            <div>
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "#365766" }}
              >
                Arrival Method
              </label>

              <select
                value={formData.ArrivalMethod}
                onChange={(e) =>
                  updateField("ArrivalMethod", e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl border outline-none"
                style={{ borderColor: "#C9DEE6" }}
              >
                <option>Walk-in</option>
                <option>Scheduled</option>
                <option>Emergency</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label
                className="block text-sm font-semibold mb-2"
                style={{ color: "#365766" }}
              >
                Triage Category
              </label>

              <select
                value={formData.TriageCategory}
                onChange={(e) =>
                  updateField("TriageCategory", e.target.value)
                }
                className="w-full px-4 py-3 rounded-xl border outline-none"
                style={{ borderColor: "#C9DEE6" }}
              >
                <option>Non-urgent</option>
                <option>Urgent</option>
                <option>Semi-urgent</option>
                <option>Emergency</option>
                <option>Immediate</option>
              </select>
            </div>
          </div>

          <button
            onClick={handlePredict}
            disabled={loading}
            className="w-full mt-8 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-60"
            style={{ backgroundColor: "#3F8EAC" }}
          >
            <Brain className="w-5 h-5" />

            {loading
              ? "Predicting Waiting Time..."
              : "Predict My Waiting Time"}
          </button>

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

          {prediction !== null && !error && (
            <div
              className="mt-8 rounded-2xl p-8 text-center border"
              style={{
                backgroundColor: "#F3FAFC",
                borderColor: "#B9DDE8",
              }}
            >
              <p
                className="text-sm font-semibold mb-2"
                style={{ color: "#5A7A8A" }}
              >
                Estimated Waiting Time
              </p>

              <div
                className="text-5xl font-bold"
                style={{ color: "#3F8EAC" }}
              >
                {prediction.toFixed(2)}
              </div>

              <p
                className="mt-2 font-medium"
                style={{ color: "#365766" }}
              >
                minutes
              </p>

              <p
                className="text-sm mt-5"
                style={{ color: "#7A929E" }}
              >
                Estimated using the hospital waiting-time prediction model.
              </p>

              <div
                className="mt-5 pt-5 border-t text-sm"
                style={{ borderColor: "#D9EAF0" }}
              >
                <span style={{ color: "#7A929E" }}>
                  Prediction generated at:
                </span>{" "}

                <span
                  className="font-semibold"
                  style={{ color: "#365766" }}
                >
                  {predictionGeneratedAt
                    ? predictionGeneratedAt.toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })
                    : ""}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function ETAPage() {
  const insights = [
    { text: "Current wait time is 23% lower than Tuesday's average for this hour.", good: true },
    { text: "Peak hour approaching at 11:30 AM — expect queue surge of ~6 patients.", good: false },
    { text: "Dr. Mehta is 18% faster than average consultation speed today.", good: true },
    { text: "No-show rate at 6.2% — below the 8.1% monthly average. Queue is healthy.", good: true },
  ];

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: "#DDEEF8" }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1" style={{ color: "#283040" }}>Smart ETA Prediction</h1>
          <p className="text-sm" style={{ color: "#7FB0CB" }}>AI-powered queue analytics · Confidence calibrated on 12,450 consultations</p>
        </div>

        {/* AI Confidence */}
        <GlassCard className="p-6 mb-6" style={{ background: "linear-gradient(135deg, rgba(63,142,172,0.07), rgba(168,205,229,0.12))" }}>
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#3F8EAC" }}>
                <Brain size={28} className="text-white" />
              </div>
              <div>
                <div className="font-black text-xl" style={{ color: "#283040" }}>AI Confidence Score</div>
                <div className="text-sm mt-0.5" style={{ color: "#5a7a8a" }}>Inputs: queue size, doctor speed, emergencies, no-show rates, historical data</div>
              </div>
            </div>
            <div className="md:ml-auto">
              <div className="text-5xl font-black" style={{ color: "#3F8EAC" }}>94%</div>
              <div className="text-sm" style={{ color: "#7FB0CB" }}>prediction accuracy</div>
            </div>
          </div>
          <div className="mt-5 h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(168,205,229,0.3)" }}>
            <div className="h-full rounded-full" style={{ width: "94%", backgroundColor: "#3F8EAC", transition: "width 1s ease" }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs" style={{ color: "#7FB0CB" }}>
            <span>0%</span><span>50%</span><span>100%</span>
          </div>
        </GlassCard>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          {[
            { label: "Queue Length Now", value: "12", sub: "patients", icon: Users, color: "#3F8EAC" },
            { label: "Avg Consultation", value: "14.2", sub: "minutes", icon: Clock, color: "#7FB0CB" },
            { label: "Predicted Wait", value: "23", sub: "minutes", icon: Timer, color: "#B74A42" },
            { label: "Congestion Level", value: "Med", sub: "~65% capacity", icon: Activity, color: "#3F8EAC" },
          ].map(m => (
            <GlassCard key={m.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "#5a7a8a" }}>{m.label}</p>
                  <p className="text-3xl font-black mt-1" style={{ color: "#283040" }}>{m.value}</p>
                  <p className="text-xs mt-1" style={{ color: m.color }}>{m.sub}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: m.color + "15" }}>
                  <m.icon size={20} style={{ color: m.color }} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Queue Trend Chart */}
          <GlassCard className="p-6 lg:col-span-2">
            <h3 className="font-bold mb-5" style={{ color: "#283040" }}>Queue Length Trend</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={queueTrend}>
                <defs>
                  <linearGradient id="qg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3F8EAC" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#3F8EAC" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,205,229,0.35)" />
                <XAxis dataKey="t" tick={{ fontSize: 11, fill: "#7FB0CB" }} />
                <YAxis tick={{ fontSize: 11, fill: "#7FB0CB" }} />
                <Tooltip contentStyle={ttStyle} />
                <Area type="monotone" dataKey="q" stroke="#3F8EAC" strokeWidth={2.5} fill="url(#qg)" name="Queue Size" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* AI Insights */}
          <GlassCard className="p-6">
            <h3 className="font-bold mb-4" style={{ color: "#283040" }}>AI Insights</h3>
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl" style={{ backgroundColor: ins.good ? "rgba(63,142,172,0.07)" : "rgba(183,74,66,0.06)" }}>
                  <TrendingUp size={13} style={{ color: ins.good ? "#3F8EAC" : "#B74A42", flexShrink: 0, marginTop: 2 }} />
                  <span className="text-xs leading-relaxed" style={{ color: "#283040" }}>{ins.text}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Hourly Volume */}
        <GlassCard className="p-6">
          <h3 className="font-bold mb-5" style={{ color: "#283040" }}>Hourly Patient Volume &amp; Wait Time Analysis</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={hourlyVolume} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,205,229,0.35)" />
              <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#7FB0CB" }} />
              <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#7FB0CB" }} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "#7FB0CB" }} />
              <Tooltip contentStyle={ttStyle} />
              <Bar yAxisId="l" dataKey="patients" fill="#3F8EAC" radius={[6, 6, 0, 0]} name="Patients" />
              <Bar yAxisId="r" dataKey="wait" fill="#A8CDE5" radius={[6, 6, 0, 0]} name="Wait (min)" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
}

// ─── Multi-Doctor Queue View ──────────────────────────────────────────────────

function DoctorsPage({ patients }: { patients: Patient[] }) {
  const getDrQueue = (name: string) => patients.filter(p => p.doctor === name && p.status === "waiting");

  const doctors = DOCTORS_INFO.map(d => ({
    ...d,
    currentWaiting: getDrQueue(d.name).length,
    queuePatients: getDrQueue(d.name),
    queueTime: getDrQueue(d.name).length * d.avgTime,
    load: Math.min(Math.round(getDrQueue(d.name).length / 8 * 100), 100),
  }));

  const chartData = doctors.map(d => ({
    name: d.name.split(" ")[1],
    "Served Today": d.today,
    "Waiting Now": d.currentWaiting,
    "Avg Time (min)": d.avgTime,
  }));

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: "#DDEEF8" }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-1" style={{ color: "#283040" }}>Multi-Doctor Queue View</h1>
          <p className="text-sm" style={{ color: "#7FB0CB" }}>Compare doctor availability and live queue status</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {doctors.map(doc => (
            <GlassCard key={doc.name} className="p-6 hover:shadow-xl hover:-translate-y-1 transition-all">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0" style={{ backgroundColor: doc.color }}>
                  {doc.initials}
                </div>
                <div>
                  <div className="font-black text-lg" style={{ color: "#283040" }}>{doc.name}</div>
                  <div className="text-sm" style={{ color: "#5a7a8a" }}>{doc.specialty}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 mb-5">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: doc.status === "Available" ? "#22c55e" : "#F59E0B" }} />
                <span className="text-sm font-semibold" style={{ color: doc.status === "Available" ? "#16a34a" : "#D97706" }}>{doc.status}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {[
                  { label: "Waiting", value: doc.currentWaiting, unit: "patients" },
                  { label: "Served Today", value: doc.today, unit: "patients" },
                  { label: "Avg Consult", value: doc.avgTime, unit: "min" },
                  { label: "Queue Time", value: doc.queueTime, unit: "min" },
                ].map(m => (
                  <div key={m.label} className="p-3 rounded-xl" style={{ backgroundColor: "rgba(168,205,229,0.15)" }}>
                    <div className="text-xs mb-1" style={{ color: "#5a7a8a" }}>{m.label}</div>
                    <div className="text-xl font-black" style={{ color: "#283040" }}>{m.value}<span className="text-xs font-normal ml-1" style={{ color: "#7FB0CB" }}>{m.unit}</span></div>
                  </div>
                ))}
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5" style={{ color: "#7FB0CB" }}>
                  <span>Queue Load</span><span>{doc.load}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(168,205,229,0.3)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${doc.load}%`, backgroundColor: doc.color }} />
                </div>
              </div>

              <div>
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#5a7a8a" }}>Next patients</div>
                {doc.queuePatients.slice(0, 3).map(p => (
                  <div key={p.token} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid rgba(168,205,229,0.2)" }}>
                    <div className="flex items-center gap-2">
                      {p.isEmergency && <AlertTriangle size={11} style={{ color: "#B74A42" }} />}
                      <span className="font-mono text-xs font-bold" style={{ color: doc.color }}>{p.token}</span>
                      <span className="text-xs" style={{ color: "#283040" }}>{p.name}</span>
                    </div>
                    <span className="text-xs font-medium" style={{ color: "#7FB0CB" }}>{p.eta}</span>
                  </div>
                ))}
                {doc.queuePatients.length === 0 && (
                  <div className="text-xs" style={{ color: "#A8CDE5" }}>No patients waiting</div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Comparison Chart */}
        <GlassCard className="p-6">
          <h3 className="font-bold mb-5" style={{ color: "#283040" }}>Doctor Performance Comparison</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} barGap={5}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,205,229,0.35)" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#7FB0CB" }} />
              <YAxis tick={{ fontSize: 11, fill: "#7FB0CB" }} />
              <Tooltip contentStyle={ttStyle} />
              <Bar dataKey="Served Today" fill="#3F8EAC" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Waiting Now" fill="#A8CDE5" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Avg Time (min)" fill="#7FB0CB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      </div>
    </div>
  );
}

// ─── Analytics Dashboard ──────────────────────────────────────────────────────

function AnalyticsPage() {
  const metrics = [
    { label: "Total Patients Today", value: "44", change: "+12% vs yesterday", good: true, icon: Users, color: "#3F8EAC" },
    { label: "Average Wait Time", value: "23 min", change: "−18% vs last week", good: true, icon: Clock, color: "#7FB0CB" },
    { label: "Queue Efficiency", value: "87%", change: "+5 pts this week", good: true, icon: Zap, color: "#22c55e" },
    { label: "Peak Hour", value: "11 AM", change: "Forecast: high load", good: false, icon: Activity, color: "#B74A42" },
    { label: "Missed Appointments", value: "3", change: "−2 vs yesterday", good: true, icon: AlertTriangle, color: "#F59E0B" },
    { label: "Emergency Cases", value: "2", change: "Active in queue", good: false, icon: Shield, color: "#B74A42" },
  ];

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: "#DDEEF8" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black mb-1" style={{ color: "#283040" }}>Analytics Dashboard</h1>
            <p className="text-sm" style={{ color: "#7FB0CB" }}>Executive performance metrics · Real-time</p>
          </div>
          <button className="self-start flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white hover:shadow-lg transition-all" style={{ backgroundColor: "#3F8EAC" }}>
            <Download size={16} /> Export Report
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
          {metrics.map(m => (
            <GlassCard key={m.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium" style={{ color: "#5a7a8a" }}>{m.label}</p>
                  <p className="text-3xl font-black mt-1" style={{ color: "#283040" }}>{m.value}</p>
                  <p className="text-xs mt-1 font-medium" style={{ color: m.good ? "#22c55e" : "#B74A42" }}>{m.change}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: m.color + "15" }}>
                  <m.icon size={20} style={{ color: m.color }} />
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Daily Traffic */}
          <GlassCard className="p-6">
            <h3 className="font-bold mb-5" style={{ color: "#283040" }}>Daily Patient Traffic</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={hourlyVolume}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3F8EAC" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#3F8EAC" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,205,229,0.35)" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#7FB0CB" }} />
                <YAxis tick={{ fontSize: 11, fill: "#7FB0CB" }} />
                <Tooltip contentStyle={ttStyle} />
                <Area type="monotone" dataKey="patients" stroke="#3F8EAC" strokeWidth={2.5} fill="url(#ag)" name="Patients" />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Weekly Trends */}
          <GlassCard className="p-6">
            <h3 className="font-bold mb-5" style={{ color: "#283040" }}>Weekly Patient Volume</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,205,229,0.35)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#7FB0CB" }} />
                <YAxis tick={{ fontSize: 11, fill: "#7FB0CB" }} />
                <Tooltip contentStyle={ttStyle} />
                <Bar dataKey="patients" fill="#3F8EAC" radius={[6, 6, 0, 0]} name="Patients" />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Queue Performance */}
          <GlassCard className="p-6 lg:col-span-2">
            <h3 className="font-bold mb-5" style={{ color: "#283040" }}>Queue Performance &amp; Efficiency (Weekly)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(168,205,229,0.35)" />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#7FB0CB" }} />
                <YAxis tick={{ fontSize: 11, fill: "#7FB0CB" }} />
                <Tooltip contentStyle={ttStyle} />
                <Line type="monotone" dataKey="efficiency" stroke="#3F8EAC" strokeWidth={2.5} dot={{ fill: "#3F8EAC", r: 4 }} name="Efficiency %" />
                <Line type="monotone" dataKey="patients" stroke="#B74A42" strokeWidth={2} strokeDasharray="4 2" dot={{ fill: "#B74A42", r: 3 }} name="Patients" />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Duration Distribution */}
          <GlassCard className="p-6">
            <h3 className="font-bold mb-4" style={{ color: "#283040" }}>Consultation Duration</h3>
            <ResponsiveContainer width="100%" height={160}>
              <RePieChart>
                <Pie data={durationDist} cx="50%" cy="50%" outerRadius={68} dataKey="value" strokeWidth={0}>
                  {durationDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={ttStyle} />
              </RePieChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-2">
              {durationDist.map(d => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                    <span style={{ color: "#283040" }}>{d.name}</span>
                  </div>
                  <span className="font-bold" style={{ color: "#283040" }}>{d.value}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// ─── Navigation Bar ───────────────────────────────────────────────────────────

function NavBar({ current, onNav }: { current: Page; onNav: (p: Page) => void }) {
  const [open, setOpen] = useState(false);

  const pages: { id: Page; label: string; Icon: React.ElementType }[] = [
    { id: "landing", label: "Home", Icon: Home },
    { id: "reception", label: "Reception", Icon: LayoutDashboard },
    { id: "patient", label: "My Queue", Icon: QrCode },
    { id: "eta", label: "ETA Engine", Icon: Brain },
    { id: "doctors", label: "Doctors", Icon: Stethoscope },
    { id: "analytics", label: "Analytics", Icon: BarChart2 },
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
  const [patients, setPatients] = useState<Patient[]>(INITIAL_PATIENTS);

  return (
    <div className="min-h-screen" style={{ fontFamily: "'Inter', sans-serif" }}>
      {page !== "landing" && <NavBar current={page} onNav={setPage} />}
      <div className={page !== "landing" ? "pt-16" : ""}>
        {page === "landing" && <LandingPage onNav={setPage} />}
        {page === "reception" && <ReceptionPage patients={patients} setPatients={setPatients} />}
        {page === "patient" && <PatientPage />}
        {page === "eta" && <ETAPage />}
        {page === "doctors" && <DoctorsPage patients={patients} />}
        {page === "analytics" && <AnalyticsPage />}
      </div>
    </div>
  );
}
