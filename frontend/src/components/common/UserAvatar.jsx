import { fmt } from "@/lib/format"

/**
 * Shared avatar component for all user types (User, Lead, Author, etc.).
 * Automatically handles initials fallback if no photo (image/avatar) is set.
 */
export default function UserAvatar({ user, size = "", className = "" }) {
  // backend uses 'image', frontend store sometimes maps it to 'avatar'
  const path = user?.image || user?.avatar
  const url = fmt.avatarUrl(path)
  const initials = fmt.initials(user?.name || user?.email || "?")

  return (
    <div className={`avatar ${size} ${className}`}>
      {url ? (
        <img src={url} alt={user?.name || "User"} />
      ) : (
        initials
      )}
    </div>
  )
}
