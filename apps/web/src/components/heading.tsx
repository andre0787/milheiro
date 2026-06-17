interface HeadingProps {
  children: React.ReactNode
  className?: string
}

export function Heading({ children, className = '' }: HeadingProps) {
  return (
    <div className={`mb-6 ${className}`}>
      <h1 className="text-3xl font-bold">{children}</h1>
      <div className="mt-1 h-1 w-16 rounded-full bg-gradient-to-r from-primary to-accent" />
    </div>
  )
}
