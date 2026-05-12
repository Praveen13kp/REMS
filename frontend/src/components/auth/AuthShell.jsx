import AuthSide from "@/components/auth/AuthSide"

export default function AuthShell({ heading, children }) {
  return (
    <div className="flex min-h-svh">
      <AuthSide heading={heading} />
      <div className="flex flex-1 items-center justify-center bg-background px-4 py-8 md:px-8">
        <div className="w-full max-w-md md:max-w-lg">{children}</div>
      </div>
    </div>
  )
}
