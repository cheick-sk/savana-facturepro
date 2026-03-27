import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from './Card'

describe('Card Components', () => {
  describe('Card', () => {
    it('should render children', () => {
      render(
        <Card>
          <div>Card content</div>
        </Card>
      )
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('should have default styling', () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('rounded-lg')
      expect(card).toHaveClass('border')
    })

    it('should accept custom className', () => {
      render(<Card className="custom-class">Content</Card>)
      const card = screen.getByText('Content')
      expect(card).toHaveClass('custom-class')
    })
  })

  describe('CardHeader', () => {
    it('should render header content', () => {
      render(<CardHeader>Header</CardHeader>)
      expect(screen.getByText('Header')).toBeInTheDocument()
    })

    it('should have proper styling', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>)
      const header = screen.getByTestId('header')
      expect(header).toHaveClass('p-6')
    })
  })

  describe('CardTitle', () => {
    it('should render title text', () => {
      render(<CardTitle>Card Title</CardTitle>)
      expect(screen.getByText('Card Title')).toBeInTheDocument()
    })

    it('should render as h3 by default', () => {
      render(<CardTitle>Title</CardTitle>)
      const title = screen.getByRole('heading', { level: 3 })
      expect(title).toBeInTheDocument()
    })
  })

  describe('CardContent', () => {
    it('should render content', () => {
      render(<CardContent>Body content</CardContent>)
      expect(screen.getByText('Body content')).toBeInTheDocument()
    })

    it('should have proper padding', () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      const content = screen.getByTestId('content')
      expect(content).toHaveClass('p-6')
    })
  })

  describe('CardFooter', () => {
    it('should render footer content', () => {
      render(<CardFooter>Footer</CardFooter>)
      expect(screen.getByText('Footer')).toBeInTheDocument()
    })

    it('should have proper styling', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer).toHaveClass('p-6')
    })
  })

  describe('Full Card Composition', () => {
    it('should render a complete card with all parts', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Total revenue: 1,000,000 GNF</p>
          </CardContent>
          <CardFooter>
            <button>View Details</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByText('Dashboard Stats')).toBeInTheDocument()
      expect(screen.getByText('Total revenue: 1,000,000 GNF')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'View Details' })).toBeInTheDocument()
    })
  })
})
