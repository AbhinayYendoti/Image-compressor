'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Image Compressor
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p className="text-gray-700">
              By accessing and using our image compression service, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p className="text-gray-700 mb-3">
              Our service provides online image compression tools that allow users to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Compress images in various formats (JPG, PNG, GIF, WebP, SVG)</li>
              <li>Process images locally in their browser</li>
              <li>Download compressed images</li>
              <li>Batch process multiple images</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. User Responsibilities</h2>
            <p className="text-gray-700 mb-3">
              You agree to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Use the service only for lawful purposes</li>
              <li>Not upload malicious files or attempt to harm our systems</li>
              <li>Respect intellectual property rights</li>
              <li>Not use the service for commercial purposes without permission</li>
              <li>Not attempt to reverse engineer or hack our service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Privacy and Data</h2>
            <p className="text-gray-700">
              Your privacy is important to us. All image processing happens locally in your browser. We do not store, collect, or transmit your images to our servers. Please review our <Link href="/privacy" className="text-primary-600 hover:text-primary-700 underline">Privacy Policy</Link> for more details.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Service Availability</h2>
            <p className="text-gray-700">
              We strive to maintain high service availability but cannot guarantee uninterrupted access. The service may be temporarily unavailable due to maintenance, updates, or technical issues.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
            <p className="text-gray-700 mb-3">
              The service and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>
            <p className="text-gray-700">
              You retain ownership of your images. We do not claim any rights to your content.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitation of Liability</h2>
            <p className="text-gray-700">
              In no event shall we be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Disclaimer of Warranties</h2>
            <p className="text-gray-700">
              The service is provided "as is" and "as available" without any warranties of any kind, either express or implied, including but not limited to the implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Advertising and Monetization</h2>
            <p className="text-gray-700 mb-3">
              Our service may display advertisements to support free access. By using our service, you acknowledge that:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>We may display third-party advertisements</li>
              <li>Advertisements help keep the service free</li>
              <li>We use cookies and tracking technologies for advertising</li>
              <li>You can opt-out of personalized advertising</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Termination</h2>
            <p className="text-gray-700">
              We may terminate or suspend your access to the service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Changes to Terms</h2>
            <p className="text-gray-700">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Governing Law</h2>
            <p className="text-gray-700">
              These Terms shall be interpreted and governed by the laws of [Your Country/State], without regard to its conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Contact Information</h2>
            <p className="text-gray-700">
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">
                <strong>Email:</strong> legal@image-compressor.com<br />
                <strong>Website:</strong> https://image-compressor.com<br />
                <strong>Address:</strong> [Your Business Address]
              </p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <Link 
            href="/" 
            className="btn-primary"
          >
            Back to Image Compressor
          </Link>
        </div>
      </div>
    </div>
  );
}
