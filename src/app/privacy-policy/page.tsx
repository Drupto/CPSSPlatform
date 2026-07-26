import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/sections/footer"

export const metadata = {
  title: "Privacy Policy | Kinetika",
}

export default function PrivacyPolicy() {
  return (
    <main className="relative min-h-screen bg-slate-50 overflow-x-hidden">
      <Navbar />

      <section className="py-24 bg-white">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="max-w-3xl mx-auto space-y-8">
            <p className="text-sm uppercase tracking-[0.24em] text-primary font-semibold">
              Privacy Policy
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-950 leading-tight">
              Your privacy matters at Kinetika
            </h1>
            <p className="text-slate-600 text-lg leading-8">
              This Privacy Policy explains how we collect, use, and protect your personal information when you use our website and services.
            </p>

            <div className="space-y-8 text-slate-700">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Information We Collect</h2>
                <p>
                  We may collect information you provide directly, such as your name, email address, and course preferences when you sign up or contact us. We may also collect information automatically through website analytics, such as IP address, browser type, and page interactions.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">How We Use Your Information</h2>
                <p>
                  We use your information to deliver our courses, respond to inquiries, improve the website, and share important updates. We do not sell your personal data to third parties.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Cookies and Analytics</h2>
                <p>
                  Our site may use cookies and analytics tools to understand user behavior and improve performance. You can control cookie preferences through your browser settings.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">How We Share Data</h2>
                <p>
                  We may share information with trusted service providers who help us operate the website, but only to the extent necessary to provide the service. We require these partners to protect your data and use it only for permitted purposes.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Your Choices</h2>
                <p>
                  You may review, update, or request deletion of your personal data by contacting us directly. You may also unsubscribe from marketing emails at any time.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Contact Us</h2>
                <p>
                  If you have questions about this policy, please reach out through the contact form on our website.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
