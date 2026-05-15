import Link from 'next/link'
import { Twitter, Linkedin, Github, Mail } from 'lucide-react'
import { Ornament } from './ornament'

type Props = {
  social?: { twitter?: string; linkedin?: string; github?: string; email?: string }
  contactEmail?: string
  ownerName?: string
  initial?: string
}

export function SiteFooter({
  social,
  contactEmail = 'contact@uc4n.com',
  ownerName = 'Umutcan Edizaslan',
  initial = 'U',
}: Props) {
  const twitter = social?.twitter
  const linkedin = social?.linkedin
  const github = social?.github
  const email = social?.email || contactEmail
  const year = new Date().getFullYear()

  const iconLinkClass =
    'classical-ink-muted hover:gold-text transition-colors inline-flex items-center justify-center'

  return (
    <footer className="relative w-full mt-10 sm:mt-16">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 py-7 sm:py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-8">
          {/* Left — laurel U emblem + tagline */}
          <div className="flex items-center gap-5">
            <Ornament variant="laurel-emblem" initial={initial} className="gold-text shrink-0" />
            <div>
              <p className="serif-display text-[11px] sm:text-[12px] tracking-[0.32em] uppercase classical-ink leading-none">
                DISCIPLINE
                <span className="gold-text mx-1.5">.</span>
                FOCUS
                <span className="gold-text mx-1.5">.</span>
                IMPACT
                <span className="gold-text">.</span>
              </p>
              <span className="gold-divider block w-16 mt-2" />
            </div>
          </div>

          {/* Right — connect block */}
          <div className="flex flex-col items-start sm:items-end gap-3">
            <p className="serif-display text-[10px] tracking-[0.42em] uppercase classical-ink-muted">
              LET&apos;S CONNECT
            </p>
            <div className="flex items-center gap-4">
              {github && (
                <Link
                  href={github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub"
                  className={iconLinkClass}
                >
                  <Github className="w-4 h-4" />
                </Link>
              )}
              {twitter && (
                <Link
                  href={twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Twitter"
                  className={iconLinkClass}
                >
                  <Twitter className="w-4 h-4" />
                </Link>
              )}
              {linkedin && (
                <Link
                  href={linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn"
                  className={iconLinkClass}
                >
                  <Linkedin className="w-4 h-4" />
                </Link>
              )}
              <a
                href={`mailto:${email}`}
                aria-label="Email"
                className="gold-text hover:gold-text-light transition-colors inline-flex items-center justify-center"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center mt-6 text-[10px] tracking-[0.18em] classical-ink-muted">
          © {year} {ownerName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
