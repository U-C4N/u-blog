import Script from 'next/script'

interface AnalyticsProps {
  measurementId?: string // Google Analytics measurement ID (GA4)
}

export function Analytics({ measurementId = 'G-XXXXXXXXXX' }: AnalyticsProps) {
  // If no measurement ID is provided, don't render anything in development
  if (
    (process.env.NODE_ENV === 'development' || !measurementId || measurementId === 'G-XXXXXXXXXX') &&
    process.env.NODE_ENV !== 'production'
  ) {
    return (
      <div data-testid="analytics-disabled" className="hidden">
        Analytics disabled in development or missing measurement ID
      </div>
    )
  }

  return (
    <>
      {/* Google Analytics (GA4) */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  )
} 