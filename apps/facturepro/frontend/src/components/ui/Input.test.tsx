import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

describe('Input Component', () => {
  describe('Rendering', () => {
    it('should render input element', () => {
      render(<Input placeholder="Enter text" />)
      expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
    })

    it('should render with label', () => {
      render(<Input label="Email" id="email" />)
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('should render with required indicator', () => {
      render(<Input label="Email" id="email" required />)
      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })

  describe('Input Types', () => {
    it('should render text input by default', () => {
      render(<Input />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'text')
    })

    it('should render email input', () => {
      render(<Input type="email" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('should render password input', () => {
      render(<Input type="password" />)
      const input = screen.getByLabelText(/password/i) || document.querySelector('input[type="password"]')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('should render number input', () => {
      render(<Input type="number" />)
      const input = document.querySelector('input[type="number"]')
      expect(input).toHaveAttribute('type', 'number')
    })
  })

  describe('Error State', () => {
    it('should display error message', () => {
      render(<Input error="This field is required" />)
      expect(screen.getByText('This field is required')).toBeInTheDocument()
    })

    it('should have error styling when error is present', () => {
      render(<Input error="Error" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-red-500')
    })
  })

  describe('Disabled State', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })

    it('should have disabled styling', () => {
      render(<Input disabled />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('disabled:opacity-50')
    })
  })

  describe('Value Handling', () => {
    it('should display controlled value', () => {
      render(<Input value="test value" onChange={() => {}} />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveValue('test value')
    })

    it('should call onChange handler', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()

      render(<Input onChange={handleChange} />)
      const input = screen.getByRole('textbox')

      await user.type(input, 'hello')
      expect(handleChange).toHaveBeenCalled()
    })
  })

  describe('Placeholder', () => {
    it('should display placeholder text', () => {
      render(<Input placeholder="Enter your name" />)
      const input = screen.getByPlaceholderText('Enter your name')
      expect(input).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have aria-invalid when error is present', () => {
      render(<Input error="Invalid input" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('should have aria-describedby for error message', () => {
      render(<Input error="Error message" id="test-input" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveAttribute('aria-describedby')
    })
  })
})
