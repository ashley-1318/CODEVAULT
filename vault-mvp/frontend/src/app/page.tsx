import Link from "next/link";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-vault-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/5 rounded-full blur-[180px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-24">
        {/* Hero Section */}
        <div className="text-center mb-20 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vault-500/10 border border-vault-500/20 text-vault-400 text-sm font-medium mb-8">
            <span className="w-2 h-2 rounded-full bg-vault-400 animate-pulse"></span>
            AI-Powered COBOL Modernization Platform
          </div>

          <h1 className="text-6xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="gradient-text">VAULT</span>
            <br />
            <span className="text-gray-200 text-5xl md:text-6xl">
              Legacy Code Intelligence
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Value-Aware Unified Legacy Transformation. Upload COBOL programs, run the{" "}
            <span className="text-vault-400 font-medium">CHRONICLE AI agent</span> to classify
            paragraphs, map regulatory compliance, and visualize dependencies — all with human
            oversight built in.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/upload"
              id="cta-upload"
              className="px-8 py-4 bg-vault-600 hover:bg-vault-500 text-white font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-vault-500/30 hover:-translate-y-0.5"
            >
              Upload COBOL Program →
            </Link>
            <Link
              href="/registry"
              id="cta-registry"
              className="px-8 py-4 bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold rounded-xl border border-gray-700 transition-all duration-200 hover:-translate-y-0.5"
            >
              View Registry
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-20">
          <FeatureCard
            icon="🤖"
            title="CHRONICLE AI Agent"
            description="LangGraph-powered multi-step pipeline classifies each COBOL paragraph into regulatory categories using Groq's llama-3.3-70b-versatile with human-in-the-loop approval."
            accent="vault"
          />
          <FeatureCard
            icon="📋"
            title="Regulatory Compliance Map"
            description="Automatically identifies Basel IV, IFRS 9, GDPR, and PCI-DSS regulatory paragraphs. Generates risk scores, compliance reports, and regulatory obligation groupings."
            accent="purple"
          />
          <FeatureCard
            icon="🕸️"
            title="Dependency Graph"
            description="Neo4j-powered graph database maps program dependencies, CALL relationships, and regulatory chains. Visualize the full legacy system architecture."
            accent="emerald"
          />
        </div>

        {/* Pipeline Steps */}
        <div className="glass-card p-8 mb-16">
          <h2 className="text-2xl font-bold text-white mb-2">
            The CHRONICLE Pipeline
          </h2>
          <p className="text-gray-400 mb-8">
            Six automated stages with a human approval gate.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[
              { step: "1", name: "Upload", desc: "Store in MinIO" },
              { step: "2", name: "Parse", desc: "Extract structure" },
              { step: "3", name: "Classify", desc: "Groq AI analysis" },
              { step: "4", name: "Dead Code", desc: "SMF cross-check" },
              { step: "5", name: "Review", desc: "Human approval" },
              { step: "6", name: "Registry", desc: "Neo4j storage" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 rounded-full bg-vault-600/30 border border-vault-500/40 flex items-center justify-center mx-auto mb-2">
                  <span className="text-vault-300 font-bold text-sm">{s.step}</span>
                </div>
                <div className="text-white font-semibold text-sm">{s.name}</div>
                <div className="text-gray-500 text-xs mt-1">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div className="text-center">
          <p className="text-gray-500 text-sm mb-4">Powered by open-source technology</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Groq LLM",
              "LangGraph",
              "FastAPI",
              "PostgreSQL + pgvector",
              "Neo4j",
              "MinIO",
              "Ollama",
              "Next.js 14",
            ].map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400 text-xs font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accent,
}: {
  icon: string;
  title: string;
  description: string;
  accent: "vault" | "purple" | "emerald";
}) {
  const accentColors = {
    vault: "from-vault-500/20 to-vault-600/10 border-vault-500/20",
    purple: "from-purple-500/20 to-purple-600/10 border-purple-500/20",
    emerald: "from-emerald-500/20 to-emerald-600/10 border-emerald-500/20",
  };

  return (
    <div
      className={`p-6 rounded-xl bg-gradient-to-br ${accentColors[accent]} border backdrop-blur-sm hover:-translate-y-1 transition-transform duration-200`}
    >
      <div className="text-3xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}
