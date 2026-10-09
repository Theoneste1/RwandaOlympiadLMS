// PLACEHOLDER CONTENT — every value below is a stand-in so the site has
// something real to render. Replace with verified Rwanda Olympiad Foundation
// details (legal name, real contact info, social links) before launch.

export const SITE = {
  name: "Rwanda Olympiad Foundation",
  shortName: "ROF",
  tagline: "Advancing mathematical excellence for every Rwandan student",
  description:
    "The Rwanda Olympiad Foundation organizes national mathematics and science competitions, exam centers, and recognition programs for students across Rwanda.",
  email: "info@rwandaolympiad.example",
  phone: "+250 700 000 000",
  address: "Kigali, Rwanda",
  socials: {
    facebook: "#",
    x: "#",
    youtube: "#",
  },
} as const;

export type NavLink =
  | { href: string; label: string; children?: undefined }
  | { href?: undefined; label: string; children: { href: string; label: string }[] };

export const NAV_LINKS: NavLink[] = [
  { href: "/competitions", label: "Competitions" },
  { href: "/exam-centers", label: "Exam Centers" },
  { href: "/schools", label: "Schools" },
  {
    label: "About",
    children: [
      { href: "/about", label: "About Us" },
      { href: "/technical-reports", label: "Technical Reports" },
    ],
  },
  { href: "/contact", label: "Contact" },
];

export const COMPETITION_SUBJECTS = ["Mathematics", "Science", "Informatics"] as const;

export const RWANDA_PROVINCES = [
  "Kigali City",
  "Northern Province",
  "Southern Province",
  "Eastern Province",
  "Western Province",
] as const;
