import React, { useState } from 'react';
import { Menu, X, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HomeNavbar() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div
            onClick={() => navigate('/')}
            className="cursor-pointer flex items-center gap-2"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center">
              <span className="text-white font-bold text-lg">FP</span>
            </div>
            <span className="font-bold text-xl text-slate-900 hidden sm:inline">
              FreePro
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => navigate('/')}
              className="text-slate-600 hover:text-indigo-600 font-medium transition"
            >
              Home
            </button>

            <button
              onClick={() => scrollToSection('why')}
              className="text-slate-600 hover:text-indigo-600 font-medium transition"
            >
              Why Choose Us
            </button>

            <div className="relative group">
              <button
                onMouseEnter={() => setIsDropdownOpen(true)}
                onMouseLeave={() => setIsDropdownOpen(false)}
                className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium transition"
              >
                Browse Jobs
                <ChevronDown size={16} />
              </button>
              {isDropdownOpen && (
                <div
                  onMouseEnter={() => setIsDropdownOpen(true)}
                  onMouseLeave={() => setIsDropdownOpen(false)}
                  className="absolute top-full left-0 mt-0 w-48 bg-white border border-slate-200 rounded-lg shadow-xl py-2"
                >
                  <button
                    onClick={() => navigate('/login-freelancer')}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                  >
                    View Available Projects
                  </button>
                  <button
                    onClick={() => navigate('/login-freelancer')}
                    className="w-full text-left px-4 py-2 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition"
                  >
                    Recommended for You
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={() => navigate('/login-freelancer')}
              className="px-4 py-2 text-indigo-600 font-semibold hover:bg-indigo-50 rounded-lg transition"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/signup-freelancer')}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-indigo-500/30 transition transform hover:scale-105"
            >
              Get Started
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-slate-600 hover:text-indigo-600"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-slate-200 pt-4">
            <button
              onClick={() => navigate('/')}
              className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-indigo-50 rounded-lg transition"
            >
              Home
            </button>
            <button
              onClick={() => scrollToSection('why')}
              className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-indigo-50 rounded-lg transition"
            >
              Why Choose Us
            </button>
            <button
              onClick={() => navigate('/login-freelancer')}
              className="block w-full text-left px-4 py-2 text-slate-600 hover:bg-indigo-50 rounded-lg transition"
            >
              Browse Jobs
            </button>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => navigate('/login-freelancer')}
                className="flex-1 px-4 py-2 text-indigo-600 font-semibold border border-indigo-600 rounded-lg hover:bg-indigo-50 transition"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup-freelancer')}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition"
              >
                Get Started
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
