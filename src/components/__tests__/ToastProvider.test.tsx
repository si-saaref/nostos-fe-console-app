import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider, useToast } from '../ToastProvider'

function ToastTrigger() {
  const toast = useToast()
  return (
    <button onClick={() => toast.error('Something went wrong')}>
      Trigger
    </button>
  )
}

describe('ToastProvider', () => {
  it('shows a toast when triggered and dismisses it after the duration', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <ToastTrigger />
      </ToastProvider>,
    )

    await user.click(screen.getByText('Trigger'))
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')

    await waitFor(
      () => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      },
      { timeout: 5000 },
    )
  }, 10000)
})
