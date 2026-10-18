import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import { HomePage } from './pages/HomePage'

// Secondary pages load on demand to keep the first download small.
const ResultsPage = lazy(() => import('./pages/ResultsPage').then((m) => ({ default: m.ResultsPage })))
const ListingPage = lazy(() => import('./pages/ListingPage').then((m) => ({ default: m.ListingPage })))
const SavedPage = lazy(() => import('./pages/CollectionPages').then((m) => ({ default: m.SavedPage })))
const ComparePage = lazy(() => import('./pages/CollectionPages').then((m) => ({ default: m.ComparePage })))
const SubmitPage = lazy(() => import('./pages/SubmitPage').then((m) => ({ default: m.SubmitPage })))
const AboutPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const NotFoundPage = lazy(() => import('./pages/AboutPage').then((m) => ({ default: m.NotFoundPage })))

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="results" element={<ResultsPage />} />
            <Route path="listings/:id" element={<ListingPage />} />
            <Route path="saved" element={<SavedPage />} />
            <Route path="compare" element={<ComparePage />} />
            <Route path="add-listing" element={<SubmitPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
