import type { AffiliateConfig } from '../lib/affiliate'
import { affiliateEnabled } from '../lib/affiliate'

type AffiliateDisclosureProps = {
  config: AffiliateConfig
  /** "inline" sits above the recommendation list; "footer" closes the page. */
  variant?: 'inline' | 'footer'
}

/**
 * FTC-style material-connection disclosure. Renders nothing until at least one
 * affiliate identifier is configured, so the untagged app carries no
 * disclosure text it does not need.
 */
export function AffiliateDisclosure({
  config,
  variant = 'inline',
}: AffiliateDisclosureProps) {
  if (!affiliateEnabled(config)) return null

  return (
    <p
      className={`disclosure disclosure--${variant}`}
      data-testid={`affiliate-disclosure-${variant}`}
    >
      <strong>Disclosure:</strong> some links on this page are retailer
      affiliate links. If you buy through them, we may earn a commission at no
      extra cost to you. Recommendations are based on published specifications
      and your answers, not on which retailer pays.
      {config.amazonTag
        ? ' As an Amazon Associate we earn from qualifying purchases.'
        : null}
    </p>
  )
}
