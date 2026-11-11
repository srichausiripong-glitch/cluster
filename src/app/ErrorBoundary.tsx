import { Component, type ReactNode } from 'react'
import { th } from '../copy/th'
import { Button } from '../design/primitives/Button'
import { resetDemo } from '../store/actions'

/**
 * Demo data lives in the browser and its shape changes between versions of the prototype.
 * If a screen cannot draw what it finds, this offers a reset instead of a blank page.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="mx-auto w-full max-w-md space-y-3 p-6">
        <h1 className="text-[20px] font-bold">{th.recover.title}</h1>
        <p className="text-muted">{th.recover.body}</p>
        <Button
          onClick={() => {
            resetDemo()
            this.setState({ failed: false })
          }}
        >
          {th.recover.action}
        </Button>
      </main>
    )
  }
}
