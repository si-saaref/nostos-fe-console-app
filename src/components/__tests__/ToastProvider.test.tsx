import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, renderHook } from '@testing-library/react'
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

  it('keeps the toast API referentially stable across unrelated re-renders', () => {
    const { result, rerender } = renderHook(() => useToast(), {
      wrapper: ({ children }) => <ToastProvider>{children}</ToastProvider>,
    })

    const firstError = result.current.error
    rerender()

    // A consumer effect with `toast` in its dependency array (e.g.
    // ConsoleSigninCallbackPage) must not re-fire just because ToastProvider
    // re-rendered for an unrelated reason - otherwise calling toast.error()
    // triggers a setState -> re-render -> new toast reference -> effect fires
    // again, looping forever ("Maximum update depth exceeded").
    expect(result.current.error).toBe(firstError)
  })
})
