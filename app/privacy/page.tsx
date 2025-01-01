'use client'

import React from 'react'

export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-lg dark:prose-invert">
        <h2>1. Information We Collect</h2>
        <p>
          We collect information you provide directly to us when you:
        </p>
        <ul>
          <li>Create an account</li>
          <li>Create or edit blog posts</li>
          <li>Upload images</li>
          <li>Interact with our services</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>
          We use the information we collect to:
        </p>
        <ul>
          <li>Provide and maintain our services</li>
          <li>Improve user experience</li>
          <li>Send important notifications</li>
          <li>Prevent fraud and abuse</li>
        </ul>

        <h2>3. Information Sharing</h2>
        <p>
          We do not sell or share your personal information with third parties except:
        </p>
        <ul>
          <li>With your consent</li>
          <li>To comply with legal obligations</li>
          <li>To protect our rights and safety</li>
        </ul>

        <h2>4. Data Security</h2>
        <p>
          We implement appropriate security measures to protect your information:
        </p>
        <ul>
          <li>Encryption in transit and at rest</li>
          <li>Regular security audits</li>
          <li>Access controls and monitoring</li>
        </ul>

        <h2>5. Your Rights</h2>
        <p>
          You have the right to:
        </p>
        <ul>
          <li>Access your personal information</li>
          <li>Correct inaccurate data</li>
          <li>Request deletion of your data</li>
          <li>Object to data processing</li>
        </ul>

        <h2>6. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us at:
        </p>
        <ul>
          <li>Email: privacy@u-blog.com</li>
          <li>Twitter: @UEdizaslan</li>
          <li>GitHub: U-C4N</li>
        </ul>

        <h2>7. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
        </p>

        <p className="text-sm text-muted-foreground mt-8">
          Last updated: January 1, 2024
        </p>
      </div>
    </main>
  )
} 