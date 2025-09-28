import React from 'react'

type Props = { children: React.ReactNode; fallback?: React.ReactNode }
type State = { hasError: boolean }

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(err: unknown) {
    // eslint-disable-next-line no-console
    console.error('UI error boundary captured:', err)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="mx-auto max-w-3xl rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="mt-2 text-sm text-slate-600">Please reload this page or navigate back.</p>
          </div>
        )
      )
    }
    return this.props.children
  }
}

