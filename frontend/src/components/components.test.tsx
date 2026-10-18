import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { emptyPreferences } from '../lib/prefs'
import { compareStore } from '../lib/storage'
import { colleges, makeResult, meta } from '../test/fixtures'
import { PreferenceForm } from './PreferenceForm'
import { ResultCard } from './ResultCard'
import { ScoreRing } from './ui'

describe('ScoreRing', () => {
  it('labels the score band', () => {
    render(<ScoreRing score={81} />)
    expect(screen.getByLabelText(/Best-Fit score 81 out of 100, Great fit/)).toBeInTheDocument()
  })
  it('says when there is not enough data', () => {
    render(<ScoreRing score={null} />)
    expect(screen.getByText('Not enough data')).toBeInTheDocument()
  })
})

describe('ResultCard', () => {
  const renderCard = (over = {}) =>
    render(<MemoryRouter><ResultCard result={makeResult(over)} meta={meta} destinationLabel="COEP" detailHref="/listings/demo-001" /></MemoryRouter>)

  it('shows the demo label, costs, reasons and warnings', () => {
    renderCard()
    expect(screen.getByText('Demo')).toBeInTheDocument()
    expect(screen.getAllByText('₹9,500')).toHaveLength(2) // rent and all-in
    expect(screen.getByText('14-minute walk to COEP')).toBeInTheDocument()
    expect(screen.getByText(/Electricity cost unknown/)).toBeInTheDocument()
    expect(screen.getByText(/Score lowered from 72 because 16% of what you weighted is not reported/)).toBeInTheDocument()
  })

  it('marks unknown rent as not reported instead of a number', () => {
    const r = makeResult()
    renderCard({ cost: { ...r.cost, rent: { amount: null, basis: 'unknown', note: '' }, all_in_known: null } })
    expect(screen.getByText('Not reported')).toBeInTheDocument()
    expect(screen.getByText('Unknown')).toBeInTheDocument()
  })

  it('adds to compare', async () => {
    renderCard()
    await userEvent.click(screen.getByRole('button', { name: /Compare/ }))
    expect(compareStore.get()).toEqual(['demo-001'])
    compareStore.clear()
  })
})

describe('PreferenceForm', () => {
  it('blocks submission until a destination is chosen, then submits', async () => {
    const onSubmit = vi.fn()
    render(<PreferenceForm initial={emptyPreferences()} meta={meta} colleges={colleges} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /Find my stays/ }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/Choose your college, search an address, or pin a spot/)).toBeInTheDocument()

    const list = screen.getByRole('listbox', { name: 'Colleges' })
    await userEvent.click(within(list).getByText('COEP Technological University'))
    await userEvent.click(screen.getByRole('button', { name: /Find my stays/ }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].destination).toEqual({ college_id: 'coep' })
  })

  it('runs the address search without submitting the whole form', async () => {
    const onSubmit = vi.fn()
    const initial = { ...emptyPreferences(), destination: { college_id: 'coep' } }
    render(<PreferenceForm initial={initial} meta={meta} colleges={colleges} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('tab', { name: /Address/ }))
    await userEvent.type(screen.getByLabelText('Address or landmark'), 'ab{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(screen.getByText('Type at least 3 characters.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('requires at least one travel mode', async () => {
    const onSubmit = vi.fn()
    const initial = { ...emptyPreferences(), destination: { college_id: 'coep' }, modes: ['walk' as const] }
    render(<PreferenceForm initial={initial} meta={meta} colleges={colleges} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Walk' }))
    await userEvent.click(screen.getByRole('button', { name: /Find my stays/ }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText('Pick at least one way to get to college.')).toBeInTheDocument()
  })
})
