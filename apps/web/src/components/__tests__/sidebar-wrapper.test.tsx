import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { usePathname } from 'next/navigation'
import { SidebarWrapper } from '@/components/sidebar-wrapper'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}))

describe('SidebarWrapper', () => {
  it('keeps the login page free of the sidebar shell', () => {
    vi.mocked(usePathname).mockReturnValue('/login')

    const { container } = render(<SidebarWrapper />)

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })
})
