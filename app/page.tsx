import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a1628] font-sans relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#c8a84b]/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#1e4d8c]/30 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#0d2044]/50 blur-3xl" />
        {/* Batik-inspired geometric pattern overlay */}
        <svg className="absolute inset-0 w-full h-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="batik" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <circle cx="30" cy="30" r="20" fill="none" stroke="#c8a84b" strokeWidth="0.5"/>
              <circle cx="30" cy="30" r="10" fill="none" stroke="#c8a84b" strokeWidth="0.5"/>
              <line x1="0" y1="30" x2="60" y2="30" stroke="#c8a84b" strokeWidth="0.3"/>
              <line x1="30" y1="0" x2="30" y2="60" stroke="#c8a84b" strokeWidth="0.3"/>
              <circle cx="0" cy="0" r="5" fill="none" stroke="#c8a84b" strokeWidth="0.5"/>
              <circle cx="60" cy="0" r="5" fill="none" stroke="#c8a84b" strokeWidth="0.5"/>
              <circle cx="0" cy="60" r="5" fill="none" stroke="#c8a84b" strokeWidth="0.5"/>
              <circle cx="60" cy="60" r="5" fill="none" stroke="#c8a84b" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#batik)"/>
        </svg>
      </div>

      <main className="relative z-10 flex flex-col items-center gap-8 px-4 py-12">
        {/* Header label */}
        <div className="text-center">
          <p className="text-[#c8a84b] text-xs tracking-[0.3em] uppercase font-medium mb-1">
            Pemerintah Daerah Istimewa Yogyakarta
          </p>
        </div>

        {/* ID Card */}
        <div className="relative w-[360px] rounded-3xl overflow-hidden shadow-2xl shadow-black/60"
             style={{
               background: "linear-gradient(135deg, #0d2044 0%, #1a3a6e 40%, #0d2044 100%)",
               border: "1px solid rgba(200,168,75,0.3)"
             }}>
          
          {/* Gold top accent bar */}
          <div className="h-1.5 w-full" style={{background: "linear-gradient(90deg, #c8a84b, #f0d080, #c8a84b)"}}/>
          
          {/* Card Header */}
          <div className="relative px-6 pt-6 pb-4">
            {/* Subtle watermark */}
            <div className="absolute right-4 top-4 opacity-5 text-[80px] font-bold text-white leading-none select-none">
              DIY
            </div>
            
            <div className="flex items-center gap-3">
              {/* Logo placeholder — replace src with actual logo */}
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{background: "linear-gradient(135deg, #c8a84b, #f0d080)", boxShadow: "0 0 20px rgba(200,168,75,0.4)"}}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 3L4 9v10l10 6 10-6V9L14 3z" stroke="#0d2044" strokeWidth="1.5" fill="none"/>
                  <path d="M14 3v16M4 9l10 6 10-6" stroke="#0d2044" strokeWidth="1.5"/>
                  <circle cx="14" cy="15" r="3" fill="#0d2044"/>
                </svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-sm leading-tight tracking-wide">
                  DINAS SOSIAL
                </h2>
                <p className="text-[#c8a84b] text-xs tracking-wider">
                  D.I. Yogyakarta
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="mt-4 h-px" style={{background: "linear-gradient(90deg, transparent, rgba(200,168,75,0.5), transparent)"}}/>
          </div>

          {/* Gold bottom accent bar */}
          <div className="h-1.5 w-full" style={{background: "linear-gradient(90deg, #c8a84b, #f0d080, #c8a84b)"}}/>
        </div>

      </main>
    </div>
  );
}
