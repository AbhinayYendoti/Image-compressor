'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicy() {
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Information We Collect</h2>
            <p className="text-gray-700 mb-3">
              Our image compression service operates entirely in your browser. We do not collect, store, or transmit your images to our servers.
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li><strong>Images:</strong> All image processing happens locally in your browser. We never upload, store, or access your images.</li>
              <li><strong>Usage Data:</strong> We may collect anonymous usage statistics to improve our service.</li>
              <li><strong>Device Information:</strong> Basic device and browser information for compatibility.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. How We Use Information</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>To provide and maintain our image compression service</li>
              <li>To improve user experience and service performance</li>
              <li>To analyze usage patterns and optimize functionality</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Data Storage and Security</h2>
            <p className="text-gray-700 mb-3">
              Your privacy is our priority. We implement the following security measures:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li><strong>Local Processing:</strong> All image compression happens in your browser</li>
              <li><strong>No Server Storage:</strong> We never store your images on our servers</li>
              <li><strong>HTTPS Encryption:</strong> All data transmission is encrypted</li>
              <li><strong>Secure Headers:</strong> We implement security headers to protect against attacks</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Third-Party Services</h2>
            <p className="text-gray-700 mb-3">
              We may use third-party services for:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li><strong>Analytics:</strong> Google Analytics to understand usage patterns</li>
              <li><strong>Advertising:</strong> Google AdSense for relevant advertisements</li>
              <li><strong>Hosting:</strong> Vercel/Google Cloud for reliable hosting</li>
            </ul>
            <p className="text-gray-700 mt-3">
              These services have their own privacy policies, which we encourage you to review.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Cookies and Tracking</h2>
            <p className="text-gray-700 mb-3">
              We use cookies and similar technologies for:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Essential website functionality</li>
              <li>Analytics and performance monitoring</li>
              <li>Personalized advertising (with your consent)</li>
            </ul>
            <p className="text-gray-700 mt-3">
              You can control cookie settings through your browser preferences.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights</h2>
            <p className="text-gray-700 mb-3">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>Access any personal data we may have about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Lodge a complaint with data protection authorities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Children's Privacy</h2>
            <p className="text-gray-700">
              Our service is not intended for children under 13. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Changes to This Policy</h2>
            <p className="text-gray-700">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Contact Us</h2>
            <p className="text-gray-700">
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-3 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">
                <strong>Email:</strong> privacy@image-compressor.com<br />
                <strong>Website:</strong> https://image-compressor.com<br />
                <strong>Address:</strong> [Your Business Address]
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Legal Basis</h2>
            <p className="text-gray-700">
              This Privacy Policy complies with:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>General Data Protection Regulation (GDPR)</li>
              <li>California Consumer Privacy Act (CCPA)</li>
              <li>Children's Online Privacy Protection Act (COPPA)</li>
              <li>Google AdSense Program Policies</li>
            </ul>
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
