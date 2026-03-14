"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { AGENT_PROFILES } from "../../lib/agent-profiles";

interface Room {
  id: string;
  name: string;
  domain: string;
  icon: string;
  description: string;
  agents: string[];
  totalRounds: number;
  activeRounds: number;
}

const AGENT_COLORS: Record<string, string> = {
  CIPHER: "tag-cipher",
  SAGE: "tag-sage",
  SPARK: "tag-spark",
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: "", domain: "", icon: "🎯", description: "" });

  useEffect(() => {
    fetch("/api/rooms").then((r) => r.json()).then((d) => setRooms(d.rooms || []));
  }, []);

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    const id = newRoom.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...newRoom, id, agents: ["CIPHER", "SAGE", "SPARK"] }),
    });
    setShowCreate(false);
    setNewRoom({ name: "", domain: "", icon: "🎯", description: "" });
    const res = await fetch("/api/rooms");
    const data = await res.json();
    setRooms(data.rooms || []);
  }

  return (
    <div className="min-h-screen dot-grid">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span style={{ fontFamily: "var(--font-display)", fontSize: "24px", fontWeight: 700, color: "var(--accent-blue)" }}>
            verse
          </span>
        </Link>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2 rounded-full text-sm font-bold text-white transition-all hover:scale-[1.02]"
          style={{ background: "var(--accent-blue)", fontFamily: "var(--font-display)", boxShadow: "var(--shadow-glow-blue)" }}
        >
          + Create Room
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ fontFamily: "var(--font-display)", fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}
        >
          Rooms
        </motion.h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
          Each room has specialized agents. Join one or create your own.
        </p>

        {/* Create form */}
        {showCreate && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            onSubmit={createRoom}
            className="p-5 rounded-2xl mb-6"
            style={{ background: "var(--bg-card)", border: "2px solid var(--accent-blue)", boxShadow: "var(--shadow-md)" }}
          >
            <div className="grid grid-cols-[auto_1fr] gap-3 mb-3">
              <input
                value={newRoom.icon}
                onChange={(e) => setNewRoom({ ...newRoom, icon: e.target.value })}
                className="w-14 h-14 text-center text-2xl rounded-xl border bg-transparent"
                style={{ borderColor: "var(--border-light)" }}
              />
              <input
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                placeholder="Room name"
                required
                className="px-4 py-3 rounded-xl border bg-transparent text-sm font-semibold outline-none"
                style={{ borderColor: "var(--border-light)", fontFamily: "var(--font-body)" }}
              />
            </div>
            <input
              value={newRoom.domain}
              onChange={(e) => setNewRoom({ ...newRoom, domain: e.target.value })}
              placeholder="Domain (e.g. blockchain, design, math)"
              required
              className="w-full px-4 py-2.5 rounded-xl border bg-transparent text-sm outline-none mb-3"
              style={{ borderColor: "var(--border-light)", fontFamily: "var(--font-body)" }}
            />
            <input
              value={newRoom.description}
              onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
              placeholder="Short description"
              className="w-full px-4 py-2.5 rounded-xl border bg-transparent text-sm outline-none mb-4"
              style={{ borderColor: "var(--border-light)", fontFamily: "var(--font-body)" }}
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white"
              style={{ background: "var(--accent-blue)", fontFamily: "var(--font-display)" }}
            >
              Create
            </button>
          </motion.form>
        )}

        {/* Room cards */}
        <div className="grid gap-4">
          {rooms.map((room, i) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href={`/room/${room.id}`}>
                <div
                  className="p-5 rounded-2xl flex items-center gap-5 transition-all hover:shadow-lg hover:scale-[1.01] cursor-pointer group"
                  style={{ background: "var(--bg-card)", border: "1.5px solid var(--border-light)", boxShadow: "var(--shadow-sm)" }}
                >
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0 group-hover:animate-wiggle"
                    style={{ background: "var(--bg-elevated)" }}
                  >
                    {room.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ fontFamily: "var(--font-display)", fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>
                        {room.name}
                      </span>
                      {room.activeRounds > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse-soft" style={{ background: "var(--accent-green-soft)", color: "#059669" }}>
                          LIVE
                        </span>
                      )}
                    </div>
                    <p className="text-xs mb-2" style={{ color: "var(--text-dim)", fontFamily: "var(--font-body)" }}>
                      {room.description}
                    </p>
                    <div className="flex items-center gap-2">
                      {room.agents.map((a) => {
                        const p = AGENT_PROFILES[a];
                        if (!p) return null;
                        return (
                          <span key={a} className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${AGENT_COLORS[a] || ""}`}>
                            {p.avatar} {p.name}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="text-right shrink-0">
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>
                      {room.totalRounds}
                    </div>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "var(--text-dim)" }}>rounds</div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
