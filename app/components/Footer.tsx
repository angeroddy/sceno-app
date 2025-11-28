"use client"

import Link from "next/link";
import Image from "next/image";
import logoApp from '../assets/images/logoApp2.png';
interface MenuItem {
  title: string;
  links: {
    text: string;
    url: string;
  }[];
}

interface FooterProps {
  tagline?: string;
  menuItems?: MenuItem[];
  copyright?: string;
  bottomLinks?: {
    text: string;
    url: string;
  }[];
}

export const Footer = ({
  tagline = "Les meilleures opportunités pour les comédiens",
  menuItems = [
    {
      title: "Opportunités",
      links: [
        { text: "Stages", url: "#" },
        { text: "Ateliers", url: "#" },
        { text: "Formations", url: "#" },
        { text: "Coaching", url: "#" },
      ],
    },
    {
      title: "À propos",
      links: [
        { text: "Qui sommes-nous", url: "#" },
        { text: "Notre mission", url: "#" },
        { text: "Contact", url: "#" },
      ],
    },
    {
      title: "Annonceurs",
      links: [
        { text: "Publier une offre", url: "#" },
        { text: "Tarifs", url: "#" },
        { text: "Avantages", url: "#" },
      ],
    },
    {
      title: "Suivez-nous",
      links: [
        { text: "Instagram", url: "#" },
        { text: "Facebook", url: "#" },
        { text: "LinkedIn", url: "#" },
      ],
    },
  ],
  copyright = "© 2026 Scenio. Tous droits réservés.",
  bottomLinks = [
    { text: "Conditions générales", url: "#" },
    { text: "Politique de confidentialité", url: "#" },
  ],
}: FooterProps) => {
  return (
    <section className="bg-black text-white py-16">
      <div className="container mx-auto px-5">
        <footer>
          <div className="grid grid-cols-2 gap-8 lg:grid-cols-6">
            <div className="col-span-2 mb-8 lg:mb-0">
              <div className="flex items-center gap-2 lg:justify-start">
                <Image
                  src={logoApp}
                  alt="Scenio Logo"
                  width={150}
                  height={50}
                  className="object-contain"
                />
              </div>
              <p className="mt-4 text-[#E6DAD0] text-lg">{tagline}</p>
            </div>
            {menuItems.map((section, sectionIdx) => (
              <div key={sectionIdx}>
                <h3 className="mb-4 font-bold text-[#E6DAD0]">{section.title}</h3>
                <ul className="space-y-3">
                  {section.links.map((link, linkIdx) => (
                    <li
                      key={linkIdx}
                      className="hover:text-[#E63832] font-medium text-gray-300 transition-colors"
                    >
                      <Link href={link.url}>{link.text}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-16 flex flex-col justify-between gap-4 border-t border-gray-700 pt-8 text-sm font-medium md:flex-row md:items-center">
            <p className="text-gray-400">{copyright}</p>
            <ul className="flex gap-6">
              {bottomLinks.map((link, linkIdx) => (
                <li key={linkIdx} className="hover:text-[#E63832] text-gray-400 transition-colors">
                  <Link href={link.url}>{link.text}</Link>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </div>
    </section>
  );
};