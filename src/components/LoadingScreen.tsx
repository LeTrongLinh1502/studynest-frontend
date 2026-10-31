import BrandLogo from './BrandLogo'

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <BrandLogo compact />
      <span className="loading-spinner" aria-label="Đang tải" />
    </main>
  )
}

export default LoadingScreen
