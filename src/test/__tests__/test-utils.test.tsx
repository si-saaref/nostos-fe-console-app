import { describe, expect, it } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test-utils'

describe('renderWithProviders', () => {
  it('renders children inside the provider stack', () => {
    renderWithProviders(<div>hello harness</div>)
    expect(screen.getByText('hello harness')).toBeInTheDocument()
  })
})
