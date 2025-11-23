'use client';
import { Mail } from 'lucide-react';
import { Github, Globe } from 'lucide-react';
import Link from 'next/link';

const Footer = () => {
  const exploreLinks = [
    { name: 'Home', href: '/' },
    { name: 'Inventory', href: '/inventory' },
    { name: 'Clubs', href: '/clubs' },
    { name: 'User', href: '/user' },
    { name: 'Admin', href: '/admin' },
    { name: 'Features', href: '/#features' },
    { name: 'Login', href: '/login' },
    { name: 'Sign-up', href: '/signup' },
    { name: 'Contact', href: '/contact' },
    { name: 'Support', href: '/support' },
  ];

  return (
    <footer className="border-t w-full border-border bg-background text-foreground">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-light tracking-wider mb-4">
              ClubSync
            </h3>
            <p className="text-foreground/50 leading-relaxed w-[80%]">
            The all-in-one platform for managing your club, inventory, and member requests. Streamline operations and focus on what matters most.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-lg font-light tracking-wide mb-4">
              EXPLORE
            </h4>
            <ul className="grid grid-cols-2 gap-y-2">
              {exploreLinks.map((link, idx) => (
                <li key={idx}>
                  <Link
                    href={link.href}
                    className="text-foreground/50 hover:text-foreground transition-colors duration-300"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-lg font-light tracking-wide mb-3">
              CONNECT
            </h4>
            <div className="flex gap-4 flex-wrap">
              <Link
                href="mailto:adityakarumbaiah@gmail.com"
                className="p-2 border border-border rounded-lg hover:scale-105 hover:border-ring group transition-colors duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Mail
                  fontSize="medium"
                  className="text-foreground/50 group-hover:text-[#77BDEBFF] transition-colors"
                />
              </Link>
              <Link
                href="https://github.com/sA-Ge1"
                className="p-2 border border-border rounded-lg hover:scale-105 hover:border-ring group transition-colors duration-300"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="text-foreground/50 group-hover:text-[#FF0000FF] transition-colors" />
              </Link>
              <Link
                href="https://adityakarumbaiah.vercel.app/"
                className="border border-border p-2 rounded-xl hover:scale-110 hover:border-ring text-gray-400 hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Globe className="transition-colors" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
