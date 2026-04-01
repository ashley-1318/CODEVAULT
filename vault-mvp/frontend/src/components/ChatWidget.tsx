"use client";

import { useState } from "react";

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "agent"; text: string; sources?: any[] }[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    const userMessage = query.trim();
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMessage }),
      });

      if (!res.ok) throw new Error("Chat request failed");
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        { role: "agent", text: data.answer, sources: data.sources },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "Sorry, I encountered an error checking the repository map." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 p-4 bg-vault-600 text-white rounded-full shadow-xl shadow-vault-600/30 hover:scale-110 hover:shadow-vault-600/50 transition-all flex items-center justify-center"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16l-3-3m0 0l3-3m-3 3h12" />
          </svg>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 md:w-96 p-4 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl flex flex-col transition-all">
          <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-800">
            <h3 className="font-semibold text-gray-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              VAULT AI Agent
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto mb-4 space-y-4 max-h-[400px]">
            {messages.length === 0 ? (
              <p className="text-gray-400 text-sm italic text-center mt-10">
                Ask a question about the modernized CODEVAULT logic.
              </p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
                  <div
                    className={`px-4 py-2 rounded-xl text-sm max-w-[85%] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-vault-600 text-white rounded-br-none"
                        : "bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 w-full justify-start">
                      {msg.sources.map((src, j) => (
                        <span key={j} className="text-[10px] px-2 py-1 bg-gray-800/50 border border-gray-700/50 rounded-lg text-emerald-400">
                          {src.paragraph_name} ({src.classification})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && (
              <div className="flex justify-start">
                <div className="px-4 py-2 rounded-xl bg-gray-800 text-gray-200 border border-gray-700 text-sm rounded-bl-none flex gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-100" />
                  <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="E.g. Where is GDPR handled?"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 outline-none focus:border-vault-500 placeholder-gray-500 transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-vault-600 hover:bg-vault-500 text-white rounded-lg p-2 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
