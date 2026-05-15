import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/sections/footer"

export const metadata = {
  title: "Terms of Service | CSCS ProPass",
}

export default function TermsOfService() {
  return (
    <main className="relative min-h-screen bg-slate-50 overflow-x-hidden">
      <Navbar />

      <section className="py-24 bg-white">
        <div className="container max-w-5xl mx-auto px-6">
          <div className="max-w-3xl mx-auto space-y-8">
            <p className="text-sm uppercase tracking-[0.24em] text-primary font-semibold">
              Terms of Service
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold text-slate-950 leading-tight">
              Terms and conditions for using CSCS ProPass
            </h1>
            <p className="text-slate-600 text-lg leading-8">
              These Terms of Service govern your use of the CSCS ProPass website. By accessing or using this site, you agree to these terms.
            </p>

            <div className="space-y-8 text-slate-700">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Use of the Website</h2>
                <p>
                  You may use the site for personal, educational purposes only. You agree not to use the website for illegal activities or to interfere with its operation.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Intellectual Property</h2>
                <p>
                  All course content, materials, and design remain the property of CSCS ProPass. You may not reproduce or distribute content without written permission.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Course Enrollment</h2>
                <p>
                  Enrolling in a course includes acceptance of the enrollment terms, payment requirements, and refund policy shown during checkout.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Disclaimers</h2>
                <p>
                  We provide educational content to support exam preparation and coaching development. Results are not guaranteed and individual outcomes may vary.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Limitation of Liability</h2>
                <p>
                  CSCS ProPass is not liable for any indirect, incidental, or consequential losses arising from use of the site or course materials.
                </p>
              </div>

              <div className="space-y-4">
                <h2 className="text-2xl font-semibold text-slate-900">Changes to Terms</h2>
                <p>
                  We may update these terms periodically. Continued use of the website after changes indicates your acceptance of the revised terms.
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
