import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/chat");
  }

  return (
    <div className="antialiased bg-background text-on-surface">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 w-full bg-background border-b border-outline z-50">
        <nav className="flex justify-between items-center h-16 px-6 md:px-12 max-w-[1200px] mx-auto">
          <div className="text-2xl font-bold text-primary tracking-tighter">
            Brain Dump
          </div>
          <div className="hidden md:flex gap-6 items-center">
            <Link href="#" className="text-on-surface-variant hover:text-primary transition-colors duration-200">
              Product
            </Link>
            <Link href="#" className="text-on-surface-variant hover:text-primary transition-colors duration-200">
              Features
            </Link>
            <Link href="#" className="text-on-surface-variant hover:text-primary transition-colors duration-200">
              Pricing
            </Link>
            <Link href="#" className="text-on-surface-variant hover:text-primary transition-colors duration-200">
              Docs
            </Link>
          </div>
          <div>
            <Link href="/register" className="btn-primary px-6 py-2 rounded-lg text-sm transition-opacity">
              Sign Up
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative px-6 md:px-12 py-24 md:py-32 max-w-[1200px] mx-auto border-x border-outline">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 flex flex-col justify-center">
              <h1 className="text-5xl md:text-6xl lg:text-[64px] font-extrabold mb-6 leading-[1.1] tracking-tight text-primary">
                Your Knowledge,<br />Structured.
              </h1>
              <p className="text-lg text-on-surface-variant max-w-xl mb-10 leading-relaxed">
                Ingest PDFs, videos, and docs. Transform scattered data into a queryable intelligence layer designed for hyper-focus.
              </p>
              <div className="flex gap-4">
                <Link href="/register" className="btn-primary px-8 py-4 rounded-lg text-lg font-semibold transition-all">
                  Get Started
                </Link>
                <Link href="/login" className="border border-outline bg-white text-primary px-8 py-4 rounded-lg text-lg font-semibold hover:bg-surface-container-low transition-all">
                  Sign In
                </Link>
              </div>
            </div>
            
            {/* Geometric Hero Visual */}
            <div className="lg:col-span-4 hidden lg:block border border-outline bg-white p-8">
              <div className="aspect-square flex flex-col gap-4">
                <div className="h-1/3 w-full border border-outline bg-surface-container-low flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl text-outline-variant">description</span>
                </div>
                <div className="flex-grow flex gap-4">
                  <div className="w-1/2 border border-outline bg-surface-container-low flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-outline-variant">video_library</span>
                  </div>
                  <div className="w-1/2 border border-outline bg-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-on-primary">psychology</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Aesthetic Divider */}
        <div className="max-w-[1200px] mx-auto border-x border-outline h-px bg-outline"></div>

        {/* How It Works Section */}
        <section className="px-6 md:px-12 py-24 max-w-[1200px] mx-auto border-x border-outline">
          <div className="mb-16">
            <h2 className="text-4xl md:text-[40px] font-bold mb-4 text-primary tracking-tight">The Workflow</h2>
            <div className="w-24 h-1 bg-primary"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l border-outline">
            {/* Step 1 */}
            <div className="p-8 border-r border-b border-outline bg-white hover:bg-surface-container-low transition-colors duration-300 group">
              <div className="mb-8 flex justify-between items-start">
                <span className="text-4xl font-extrabold text-outline-variant">01</span>
                <div className="p-3 border border-outline rounded bg-white">
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform duration-300">upload_file</span>
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-primary">Ingest</h3>
              <p className="text-base text-on-surface-variant leading-relaxed">
                Drop any document, transcript, or link. Our pipeline handles the heavy lifting of OCR and parsing.
              </p>
            </div>
            
            {/* Step 2 */}
            <div className="p-8 border-r border-b border-outline bg-white hover:bg-surface-container-low transition-colors duration-300 group">
              <div className="mb-8 flex justify-between items-start">
                <span className="text-4xl font-extrabold text-outline-variant">02</span>
                <div className="p-3 border border-outline rounded bg-white">
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform duration-300">analytics</span>
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-primary">Process</h3>
              <p className="text-base text-on-surface-variant leading-relaxed">
                Neural embeddings map your data into a multidimensional vector space, uncovering hidden connections.
              </p>
            </div>
            
            {/* Step 3 */}
            <div className="p-8 border-r border-b border-outline bg-white hover:bg-surface-container-low transition-colors duration-300 group">
              <div className="mb-8 flex justify-between items-start">
                <span className="text-4xl font-extrabold text-outline-variant">03</span>
                <div className="p-3 border border-outline rounded bg-white">
                  <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform duration-300">chat_bubble</span>
                </div>
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-primary">Ask</h3>
              <p className="text-base text-on-surface-variant leading-relaxed">
                Query your entire knowledge base in natural language. Get citations and structured summaries instantly.
              </p>
            </div>
          </div>
        </section>

        {/* Bento Grid Visuals Section */}
        <section className="px-6 md:px-12 py-24 max-w-[1200px] mx-auto border-x border-outline bg-white">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 border border-outline p-8 h-80 relative overflow-hidden flex flex-col justify-end bg-surface-container-low">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black to-transparent" />
              <h4 className="text-2xl font-semibold relative z-10 text-primary">Contextual Memory</h4>
              <p className="text-base text-on-surface-variant relative z-10 mt-1">AI that remembers what you&apos;ve uploaded, perpetually.</p>
            </div>
            
            <div className="md:col-span-1 border border-outline p-8 h-80 flex flex-col items-center justify-center gap-4 text-center hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined text-6xl text-primary">lock_open</span>
              <h4 className="text-xs font-semibold uppercase tracking-widest text-primary">End-to-End Encryption</h4>
            </div>
            
            <div className="md:col-span-1 border border-outline p-8 h-80 bg-primary text-on-primary flex flex-col justify-between hover:opacity-90 transition-opacity">
              <span className="material-symbols-outlined text-4xl">bolt</span>
              <h4 className="text-2xl font-semibold">Instant Retrieval</h4>
            </div>
            
            <div className="md:col-span-1 border border-outline p-8 h-64 flex flex-col justify-center gap-2 hover:bg-surface-container-low transition-colors">
              <div className="h-2 w-3/4 bg-outline-variant"></div>
              <div className="h-2 w-full bg-outline-variant"></div>
              <div className="h-2 w-1/2 bg-primary"></div>
              <p className="mt-4 text-xs font-semibold text-primary uppercase tracking-widest">Precision Mapping</p>
            </div>
            
            <div className="md:col-span-3 border border-outline p-8 h-64 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:bg-surface-container-low transition-colors">
              <div>
                <h4 className="text-2xl font-semibold text-primary mb-1">Multi-Format Support</h4>
                <p className="text-base text-on-surface-variant">PDF, Markdown, HTML, MP4, and more.</p>
              </div>
              <div className="flex gap-2">
                <div className="w-12 h-12 border border-outline bg-white flex items-center justify-center"><span className="material-symbols-outlined text-primary">article</span></div>
                <div className="w-12 h-12 border border-outline bg-white flex items-center justify-center"><span className="material-symbols-outlined text-primary">movie</span></div>
                <div className="w-12 h-12 border border-outline bg-white flex items-center justify-center"><span className="material-symbols-outlined text-primary">code</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="px-6 md:px-12 py-32 max-w-[1200px] mx-auto border-x border-b border-outline bg-surface-container-low">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-[40px] font-bold mb-8 text-primary tracking-tight">Ready to build your second brain?</h2>
            <p className="text-lg text-on-surface-variant mb-12 leading-relaxed">
              Join 10,000+ knowledge workers who have automated their information architecture.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/register" className="btn-primary px-10 py-5 rounded-lg text-lg font-semibold transition-all">
                Get Started Now
              </Link>
              <Link href="/register" className="bg-white border border-outline text-primary px-10 py-5 rounded-lg text-lg font-semibold hover:bg-surface-container-low transition-all">
                Talk to Sales
              </Link>
            </div>
            <p className="mt-8 text-xs font-semibold text-on-surface-variant">No credit card required. 14-day free trial.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full bg-background border-t border-outline">
        <div className="flex flex-col md:flex-row justify-between items-center py-12 px-6 md:px-12 max-w-[1200px] mx-auto gap-6">
          <div className="text-2xl font-bold text-primary tracking-tighter">Brain Dump</div>
          <div className="flex gap-6 my-6 md:my-0">
            <Link href="#" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">Privacy</Link>
            <Link href="#" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">Terms</Link>
            <Link href="#" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">Twitter</Link>
            <Link href="#" className="text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors duration-200">GitHub</Link>
          </div>
          <div className="text-sm font-semibold text-on-surface-variant">
            © 2026 Brain Dump AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
