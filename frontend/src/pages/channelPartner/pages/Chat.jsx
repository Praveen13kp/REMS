import { MessageSquare, Send } from "lucide-react"

// Placeholder. Real chat needs a Message model, threads (per-company and
// per-lead), unread tracking, mentions, and either WebSocket or
// short-polling for real-time delivery. Not in this commit.

export default function Chat() {
  return (
    <>
      <div className="cp-page-head">
        <div>
          <h1>Chat</h1>
          <p>Direct messaging between companies and channel partners.</p>
        </div>
      </div>

      <div className="cp-coming-soon">
        <MessageSquare size={32} style={{ opacity: 0.5 }} />
        <h2>Internal chat — coming soon</h2>
        <p>
          We're building per-company chat threads and per-lead conversation
          channels with file sharing, mentions, and unread badges. For now,
          use the lead notes (visible on each lead page) to leave context.
        </p>
      </div>
    </>
  )
}
