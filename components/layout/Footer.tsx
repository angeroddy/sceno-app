"use client"

import Link from "next/link";
import Image from "next/image";
import logoApp from '@/app/assets/images/logoApp2.png';

interface FooterProps {
  tagline?: string;
  copyright?: string;
  bottomLinks?: {
    text: string;
    url: string;
  }[];
}

export const Footer = ({
  tagline = "Une opportunité à prendre, maintenant, tout de suite.",
  copyright = "© 2026 formations-artistiques.fr. Tous droits réservés.",
  bottomLinks = [
    { text: "Mentions légales", url: "#" },
    { text: "Conditions générales", url: "#" },
    { text: "Politique de confidentialité", url: "#" },
  ],
}: FooterProps) => {
  return (
    <footer className="bg-black py-12 text-white" role="contentinfo">
      <div className="container mx-auto px-5">
        <div className="flex flex-col items-start">
          <div className="flex items-center">
            <Image
              src={logoApp}
              alt="formations-artistiques.fr"
              width={340}
              height={52}
              className="h-auto w-[260px] max-w-full object-contain sm:w-[340px]"
            />
          </div>
          <p className="mt-4 max-w-xl text-base text-[#E6DAD0] sm:text-lg">{tagline}</p>

          <div className="mt-10 flex w-full flex-col justify-between gap-4 border-t border-gray-700 pt-8 text-sm font-medium md:flex-row md:items-center">
            <p className="text-gray-400">{copyright}</p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {bottomLinks.map((link, linkIdx) => (
                <li key={linkIdx} className="hover:text-[#E63832] text-gray-400 transition-colors">
                  <Link href={link.url}>{link.text}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};
