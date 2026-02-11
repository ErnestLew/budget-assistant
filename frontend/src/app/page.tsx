import Link from "next/link";
import {
  ArrowRight,
  Receipt,
  PieChart,
  Bell,
  Zap,
  Shield,
  TrendingUp,
  Wallet,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-secondary-100">
        <nav className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-600 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-bold text-secondary-900">
              Budget Assistant
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/signin"
              className="text-sm font-medium text-secondary-600 hover:text-secondary-900 transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signin"
              className="text-sm font-medium bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all hover:shadow-lg hover:shadow-primary-600/20"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-primary-100">
            <Zap className="h-4 w-4" />
            AI-Powered Expense Tracking
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-secondary-900 leading-tight tracking-tight mb-6">
            Track Expenses
            <br />
            <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              Automatically
            </span>
          </h1>
          <p className="text-lg md:text-xl text-secondary-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Connect Gmail, let AI parse your receipts, and get real-time
            spending insights. No manual entry. Built for Malaysia.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 bg-primary-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-primary-700 transition-all hover:shadow-xl hover:shadow-primary-600/20 hover:-translate-y-0.5"
            >
              Start Free <ArrowRight className="h-5 w-5" />
            </Link>
            <div className="flex items-center gap-2 text-sm text-secondary-400">
              <Shield className="h-4 w-4" />
              <span>Read-only Gmail access</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-secondary-50/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Everything you need to manage money
            </h2>
            <p className="text-lg text-secondary-500 max-w-2xl mx-auto">
              Smart features that save you hours of manual tracking
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Receipt className="h-6 w-6" />}
              iconBg="bg-green-50 text-green-600"
              title="Auto Receipt Parsing"
              description="AI reads your Gmail receipts and extracts merchant, amount, and date automatically."
            />
            <FeatureCard
              icon={<PieChart className="h-6 w-6" />}
              iconBg="bg-blue-50 text-blue-600"
              title="Smart Categories"
              description="Transactions are auto-categorized with 13 Malaysian-centric categories like Food, Grab, TnG."
            />
            <FeatureCard
              icon={<TrendingUp className="h-6 w-6" />}
              iconBg="bg-purple-50 text-purple-600"
              title="Spending Analytics"
              description="Charts, trends, and insights that help you understand where your money goes."
            />
            <FeatureCard
              icon={<Wallet className="h-6 w-6" />}
              iconBg="bg-orange-50 text-orange-600"
              title="Budget Tracking"
              description="Set budgets per category, track progress, and get alerts before you overspend."
            />
            <FeatureCard
              icon={<Bell className="h-6 w-6" />}
              iconBg="bg-red-50 text-red-600"
              title="Duplicate Detection"
              description="AI groups potential duplicates so you never count the same receipt twice."
            />
            <FeatureCard
              icon={<Shield className="h-6 w-6" />}
              iconBg="bg-teal-50 text-teal-600"
              title="Verify & Control"
              description="Review every AI-parsed transaction. Approve, reject, or edit before it counts."
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
              Up and running in minutes
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: 1, title: "Connect Gmail", desc: "One-click Google OAuth" },
              { step: 2, title: "Sync Receipts", desc: "AI finds your receipts" },
              { step: 3, title: "Auto Categorize", desc: "Smart classification" },
              { step: 4, title: "Track & Save", desc: "View insights instantly" },
            ].map((item) => (
              <div key={item.step} className="text-center relative">
                <div className="w-14 h-14 bg-primary-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg shadow-primary-600/20">
                  {item.step}
                </div>
                <h4 className="font-semibold text-secondary-900 mb-1">
                  {item.title}
                </h4>
                <p className="text-sm text-secondary-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-3xl">
          <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to take control of your spending?
            </h2>
            <p className="text-primary-100 mb-8 text-lg">
              Free to use. No credit card required. Just your Gmail.
            </p>
            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 bg-white text-primary-700 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-primary-50 transition-all hover:shadow-xl"
            >
              Get Started Free <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-secondary-100 py-8 px-6">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-secondary-700">
              Budget Assistant
            </span>
          </div>
          <p className="text-xs text-secondary-400">
            Built with Next.js, FastAPI & AI
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  iconBg,
  title,
  description,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-secondary-100 hover:border-secondary-200 hover:shadow-lg transition-all duration-300 group">
      <div
        className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <h3 className="text-base font-semibold text-secondary-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-secondary-500 leading-relaxed">
        {description}
      </p>
    </div>
  );
}
