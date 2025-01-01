'use client'

import React from 'react'

export default function PrivacyPage() {
  return (
    <main className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy for U-Blog Chrome Extension</h1>

      <div className="prose prose-lg dark:prose-invert">
        <p className="text-lg">
          Last updated: January 1, 2024
        </p>

        <h2>1. Data Collection</h2>
        <p>
          Our Chrome extension collects minimal data necessary for functionality:
        </p>
        <ul>
          <li>Browser storage data for settings and preferences</li>
          <li>Temporary data for extension functionality</li>
          <li>No personal information is collected</li>
        </ul>

        <h2>2. Browser Permissions</h2>
        <p>
          The extension requires these permissions:
        </p>
        <ul>
          <li>Storage: To save your preferences</li>
          <li>Tabs: To interact with browser tabs</li>
          <li>Active Tab: To access the current webpage</li>
        </ul>

        <h2>3. Data Usage</h2>
        <p>
          We use collected data solely for:
        </p>
        <ul>
          <li>Providing extension functionality</li>
          <li>Improving user experience</li>
          <li>Debugging and error tracking</li>
        </ul>

        <h2>4. Third-Party Services</h2>
        <p>
          Our extension:
        </p>
        <ul>
          <li>Does not share data with third parties</li>
          <li>Does not use analytics services</li>
          <li>Does not track user behavior</li>
        </ul>

        <h2>5. Data Storage</h2>
        <p>
          Data storage practices:
        </p>
        <ul>
          <li>All data is stored locally in your browser</li>
          <li>No cloud storage or external servers used</li>
          <li>Data is cleared when extension is uninstalled</li>
        </ul>

        <h2>6. User Rights</h2>
        <p>
          As a user, you can:
        </p>
        <ul>
          <li>Clear stored data anytime</li>
          <li>Disable extension permissions</li>
          <li>Uninstall extension to remove all data</li>
        </ul>

        <h2>7. Updates</h2>
        <p>
          When we update this policy:
        </p>
        <ul>
          <li>Changes will be noted in Chrome Web Store</li>
          <li>Major changes will be notified in-extension</li>
          <li>Previous versions will be archived</li>
        </ul>

        <h2>8. Contact</h2>
        <p>
          For questions or concerns:
        </p>
        <ul>
          <li>GitHub: <a href="https://github.com/U-C4N" target="_blank" rel="noopener noreferrer">@U-C4N</a></li>
          <li>Twitter: <a href="https://twitter.com/UEdizaslan" target="_blank" rel="noopener noreferrer">@UEdizaslan</a></li>
          <li>Email: privacy@u-blog.com</li>
        </ul>

        <div className="bg-muted/20 p-4 rounded-lg mt-8">
          <p className="text-sm text-muted-foreground">
            Note: This extension is designed with privacy in mind. We collect only what&apos;s necessary for functionality and store everything locally on your device.
          </p>
        </div>
      </div>
    </main>
  )
} 