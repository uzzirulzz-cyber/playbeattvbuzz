"use client";
import dynamic from "next/dynamic";

// PLAYBEATTV — full IPTV subscription platform (client-rendered SPA over hash routes)
const PbApp = dynamic(() => import("@/pbtv/app"), {
  ssr: false,
  loading: () => (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#07090f" }}>
      <div className="pb-spinner" />
    </div>
  ),
});

export default function Page() {
  return <PbApp />;
}
