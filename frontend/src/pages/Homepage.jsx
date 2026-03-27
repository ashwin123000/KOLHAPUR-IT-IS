import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, TrendingUp, Award, Clock } from "lucide-react";
import HomeNavbar from "../components/HomeNavbar";

const Homepage = () => {
  const navigate = useNavigate();
  const [searchSkills, setSearchSkills] = useState("");
  const [searchLocation, setSearchLocation] = useState("");

  const handleSearch = () => {
    // Navigate to login first, then to job browsing
    navigate("/login-freelancer");
  };

  return (
    <div className="bg-white min-h-screen font-sans">
      <HomeNavbar />

      {/* HERO SECTION */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50" />
        
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 py-20">
          <div className="text-center">
            <div className="inline-block mb-4 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold">
              ✨ Join 50,000+ Freelancers
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 mb-6 leading-tight">
              Find Your Next <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Freelance Project</span>
            </h1>
            
            <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
              Discover premium projects from quality clients. Build your portfolio, get recurring opportunities, and earn what you deserve.
            </p>

            {/* SEARCH BAR */}
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row gap-3 bg-white rounded-2xl shadow-xl p-3 border border-slate-200">
                <div className="flex-1 flex items-center px-4">
                  <input
                    type="text"
                    placeholder="Skills / Role (e.g. Web Developer, Designer)"
                    value={searchSkills}
                    onChange={(e) => setSearchSkills(e.target.value)}
                    className="w-full outline-none text-slate-900 placeholder-slate-400"
                  />
                </div>
                <div className="h-px md:h-12 bg-slate-200 md:bg-slate-200" />
                <div className="flex-1 flex items-center px-4">
                  <input
                    type="text"
                    placeholder="Location (Optional)"
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="w-full outline-none text-slate-900 placeholder-slate-400"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-8 py-3 rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition font-semibold flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  Explore Projects
                  <ArrowRight size={18} />
                </button>
              </div>
              <p className="text-sm text-slate-500 mt-3">No credit card required to browse projects</p>
            </div>
          </div>
        </div>
      </div>

      {/* CATEGORY SECTION */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-slate-900 mb-2">Popular Categories</h2>
          <p className="text-slate-600">Start your search by exploring these trending skills</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "💻", name: "Web Development" },
            { icon: "🎨", name: "UI/UX Design" },
            { icon: "🤖", name: "AI & Machine Learning" },
            { icon: "📱", name: "Mobile Apps" },
            { icon: "🔗", name: "Blockchain" },
            { icon: "📊", name: "Data Science" },
            { icon: "📢", name: "Digital Marketing" },
            { icon: "✍️", name: "Content Writing" },
          ].map((item) => (
            <button
              key={item.name}
              onClick={() => navigate("/login-freelancer")}
              className="group bg-gradient-to-br from-slate-50 to-slate-100 hover:from-indigo-50 hover:to-purple-50 px-4 py-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition text-left"
            >
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="font-semibold text-slate-900 group-hover:text-indigo-600 transition">
                {item.name}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* WHY CHOOSE US SECTION */}
      <div id="why" className="bg-gradient-to-br from-slate-900 to-slate-800 py-20 px-4 md:px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-3">
              Why Choose FreePro?
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              A platform built specifically for freelancers who want fair opportunities and real growth
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Award size={32} />}
              title="Reliability Score"
              desc="Get ranked based on deadlines, quality, and performance. Build real credibility, not fake hype."
            />
            <FeatureCard
              icon={<TrendingUp size={32} />}
              title="Smart Matching Engine"
              desc="Our AI suggests the best projects for your skills and experience level. Spend less time searching."
            />
            <FeatureCard
              icon={<Clock size={32} />}
              title="Active Boost"
              desc="More active engagement = better visibility. Stay visible to clients without ghost profiles."
            />
            <FeatureCard
              icon={<Briefcase size={32} />}
              title="Quality Projects Only"
              desc="Spam and low-quality proposals are auto-rejected. Only serious clients and real opportunities."
            />
            <FeatureCard
              icon={<Award size={32} />}
              title="Fair Compensation"
              desc="Transparent pricing, milestone-based payments, and protection against unfair budgets."
            />
            <FeatureCard
              icon={<TrendingUp size={32} />}
              title="Growth Tools"
              desc="Portfolio showcase, skill verification, and client testimonials to accelerate your career."
            />
          </div>
        </div>
      </div>

      {/* STATS SECTION */}
      <div className="bg-white py-16 px-4 md:px-6 border-t border-slate-200">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">50K+</div>
              <p className="text-slate-600">Active Freelancers</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">10K+</div>
              <p className="text-slate-600">Monthly Projects</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">$5M+</div>
              <p className="text-slate-600">Paid Out Yearly</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">4.9★</div>
              <p className="text-slate-600">Average Rating</p>
            </div>
          </div>
        </div>
      </div>

      {/* TESTIMONIALS SECTION */}
      <div className="bg-slate-50 py-16 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Loved by Freelancers</h2>
            <p className="text-slate-600">See what successful freelancers are saying about their experience</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Sarah Chen",
                role: "Web Developer",
                image: "SC",
                quote: "Finally a platform that values quality over quantity. I earned $5K in my first month!",
                rating: 5
              },
              {
                name: "Marcus Williams",
                role: "UI/UX Designer",
                image: "MW",
                quote: "The AI matching is incredible. I'm getting projects that actually match my expertise.",
                rating: 5
              },
              {
                name: "Emma Rodriguez",
                role: "Content Writer",
                image: "ER",
                quote: "Transparent, fair, and supportive. This is how freelancing should work.",
                rating: 5
              }
            ].map((testimonial) => (
              <div key={testimonial.name} className="bg-white p-6 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold">
                    {testimonial.image}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{testimonial.name}</p>
                    <p className="text-sm text-slate-600">{testimonial.role}</p>
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} className="text-yellow-400">★</span>
                  ))}
                </div>
                <p className="text-slate-600 italic">"{testimonial.quote}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FINAL CTA SECTION */}
      <div className="relative overflow-hidden py-20 px-4 md:px-6">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Level Up Your Freelance Career?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join thousands of successful freelancers. Start earning on day one.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate("/signup-freelancer")}
              className="px-8 py-4 bg-white text-indigo-600 font-bold rounded-lg hover:shadow-xl hover:shadow-indigo-500/30 transition transform hover:scale-105"
            >
              Get Started Free
            </button>
            <button
              onClick={() => navigate("/login-freelancer")}
              className="px-8 py-4 border-2 border-white text-white font-bold rounded-lg hover:bg-white/10 transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4 md:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center mb-4">
                <span className="text-white font-bold">FP</span>
              </div>
              <p className="text-sm">FreePro - Where talent meets opportunity.</p>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Platform</h3>
              <ul className="space-y-2 text-sm">
                <li><button className="hover:text-indigo-400 transition">Browse Jobs</button></li>
                <li><button className="hover:text-indigo-400 transition">For Clients</button></li>
                <li><button className="hover:text-indigo-400 transition">How It Works</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Community</h3>
              <ul className="space-y-2 text-sm">
                <li><button className="hover:text-indigo-400 transition">Blog</button></li>
                <li><button className="hover:text-indigo-400 transition">Help Center</button></li>
                <li><button className="hover:text-indigo-400 transition">Contact</button></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><button className="hover:text-indigo-400 transition">Terms of Service</button></li>
                <li><button className="hover:text-indigo-400 transition">Privacy Policy</button></li>
                <li><button className="hover:text-indigo-400 transition">Cookie Policy</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">&copy; 2024 FreePro. All rights reserved.</p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <button className="hover:text-indigo-400 transition">Twitter</button>
              <button className="hover:text-indigo-400 transition">LinkedIn</button>
              <button className="hover:text-indigo-400 transition">Discord</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }) => (
  <div className="bg-slate-800 bg-opacity-50 p-8 rounded-xl border border-slate-700 hover:border-indigo-500 transition">
    <div className="text-indigo-400 mb-4">{icon}</div>
    <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
    <p className="text-slate-300 text-sm leading-relaxed">{desc}</p>
  </div>
);

export default Homepage;