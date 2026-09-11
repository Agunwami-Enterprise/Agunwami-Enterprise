import { BiUser, BiShoppingBag, BiStore, BiChip, BiCar, BiDollar } from "react-icons/bi";
import { LuUsers, LuBriefcase } from "react-icons/lu";
import { BsFillBagFill } from "react-icons/bs";
import { RiHeartFill } from "react-icons/ri";

export interface ProjectTestimonial {
  quote: string;
  author: string;
  role: string;
  avatar: string;
  featured?: boolean;
  rating: number;
}

export interface ProjectStat {
  value: string;
  label: string;
}

export interface ProjectItem {
  client: boolean;
  icon?: React.ElementType;
  name: string;
  image?: string;
  homeDescription: string;
  projectCategory: string;
  description: string;
  challenges: string;
  solution: string;
  technologyStack: string[];
  status: string;
  link: string;
  subtitle?: string;
  heroBgClass?: string;
  stats?: ProjectStat[];
  deliverables?: string[];
  testimonials?: ProjectTestimonial[];
  key?: string[];
  ecoshort?: string;
  ecodesc?: string;
  ecokey?: string[];
  impact?: string;
}

export const projects: ProjectItem[] = [
  {
    client: true,
    icon: BiStore,
    name: "Trendora Store",
    image: "/trendora.jpg",
    homeDescription: "Modern retail platform offering curated fashion and lifestyle products.",
    projectCategory: "Retail",
    subtitle: "Modern retail platform offering curated fashion and lifestyle products.",
    heroBgClass: "bg-delight-hero dark:bg-delight-hero-dark",
    description: "Trendora is a fast-growing modern lifestyle brand offering curated apparel and retail goods to thousands of active customers across emerging markets.",
    challenges: "Needed a scalable retail platform with multi-vendor support, inventory management, fast checkout, and responsive analytics to support expanding sales volume.",
    solution: "Created a feature-rich retail platform with high-speed product catalogs, automated vendor onboarding, order tracking, and custom conversion funnels.",
    technologyStack: ["Next.js", "Tailwind CSS", "Stripe", "Supabase", "Vercel"],
    stats: [
      { value: "4×", label: "ONLINE SALES GROWTH" },
      { value: "35%", label: "INCREASE IN CHECKOUT RATE" },
      { value: "3 weeks", label: "LAUNCH TURNAROUND" },
    ],
    deliverables: [
      "Dynamic catalog with multi-vendor support",
      "One-click checkout and payment processing",
      "Vendor analytics and sales dashboard",
      "Automated logistics & order fulfillment pipeline",
      "Cross-device responsive storefront",
      "Role-based administrative controls",
    ],
    testimonials: [
      {
        quote:
          "“Agunwami Enterprise delivered an experience far beyond standard e-commerce templates. Our customer engagement and retention skyrocketed after launch.”",
        author: "Trendora Leadership",
        role: "Managing Director, Trendora Store",
        avatar: "/whoweare.jpg",
        featured: true,
        rating: 5,
      },
    ],
    status: "ACTIVE",
    link: "/projects/trendora",
  },
  {
    client: true,
    icon: LuBriefcase,
    name: "Meridian Crest Solutions",
    image: "/meridian.jpg",
    homeDescription: "Professional services firm providing business consulting and strategic solutions.",
    projectCategory: "Corporate",
    subtitle: "Strategic business consulting and enterprise digital solutions.",
    heroBgClass: "bg-project-hero dark:bg-project-hero-dark",
    description: "Professional services firm providing business consulting, strategic advisory, and management solutions to high-growth organizations.",
    challenges: "Required a professional web presence with service showcasing, automated client onboarding, and lead management capabilities.",
    solution: "Delivered a corporate website with CMS integration, service portfolio management, client testimonials, and an automated lead capture system.",
    technologyStack: ["Next.js", "TypeScript", "Sanity CMS", "Motion"],
    stats: [
      { value: "2.5×", label: "QUALIFIED LEAD VOLUME" },
      { value: "65%", label: "ENGAGEMENT TIME INCREASE" },
      { value: "10 days", label: "DEPLOYMENT SPEED" },
    ],
    deliverables: [
      "Headless CMS configuration & integration",
      "Interactive service matrix & portfolio",
      "Automated client intake pipeline",
      "Enterprise SEO optimization",
      "Mobile-responsive design",
      "Analytics & conversion tracking",
    ],
    testimonials: [
      {
        quote:
          "“The new platform immediately elevated our brand authority. Client inquiries doubled within the first month of launching.”",
        author: "Oluwaseun Adeyemi",
        role: "Managing Partner, Meridian Crest Solutions",
        avatar: "/whoweare.jpg",
        featured: true,
        rating: 5,
      },
    ],
    status: "ACTIVE",
    link: "/projects/meridiancrestsolutions",
  },
  {
    client: true,
    icon: RiHeartFill,
    name: "Abia Women Assembly",
    image: "/awa.png",
    homeDescription: "Custom event registration and community management platform for Abia Women Assembly",
    projectCategory: "Non-Profit",
    subtitle: "Digital infrastructure for a movement.",
    heroBgClass: "bg-awa-hero dark:bg-awa-hero-dark",
    description: "Community organization focused on empowering women through education, economic opportunities, and advocacy across Abia State. AWA needed a platform that could unite and activate a distributed membership base.",
    challenges: "Required a digital platform to manage programs, coordinate events, and engage members across multiple locations — all without a dedicated technical team on staff.",
    solution: "Developed a comprehensive community platform with member portals, event management, resource libraries, and communication tools. Included an admin console so staff could manage everything without developer support.",
    technologyStack: ["Next.js", "Tailwind CSS", "Supabase", "Vercel"],
    stats: [
      { value: "1,200+", label: "MEMBERS ONBOARDED" },
      { value: "60%", label: "INCREASE IN EVENT ATTENDANCE" },
      { value: "0", label: "DEVELOPERS REQUIRED POST-LAUNCH" },
    ],
    deliverables: [
      "Member registration & portal",
      "Event creation and RSVP system",
      "Resource and document library",
      "Staff admin console",
      "Newsletter and communication hub",
      "Mobile-first responsive design",
    ],
    testimonials: [
      {
        quote:
          "“Before this platform, coordinating our membership felt like shouting into the wind. Now we have a real home for our community — events run smoothly, members can access resources anytime, and our team can manage everything themselves. AE did not just build us a website; they gave us infrastructure.”",
        author: "Dr. Ngozi Anyaesi",
        role: "President, Abia Women Assembly",
        avatar: "/ngozi.png",
        featured: true,
        rating: 5,
      },
      {
        quote:
          "“The event management system is incredibly intuitive. Our team, who are not tech-savvy at all, picked it up within a day. Registration and reminders are automated, and attendance has grown substantially since launch.”",
        author: "Chinwe Nwachukwu",
        role: "Programs Coordinator, AWA",
        avatar: "/chinwe.png",
        rating: 5,
      },
      {
        quote:
          "“As a member, I love being able to see upcoming events, access training materials, and connect with other members all in one place. It truly feels like a community now.”",
        author: "Ada Obi",
        role: "Member, Abia Women Assembly",
        avatar: "/ada.png",
        rating: 5,
      },
    ],
    status: "ACTIVE",
    link: "/projects/abiawomenassembly",
  },
  {
    client: true,
    icon: BiShoppingBag,
    name: "Delight Tees",
    image: "/delight.jpg",
    homeDescription: "Custom e-commerce platform for premium apparel brand",
    projectCategory: "E-Commerce",
    subtitle: "A custom apparel platform built to scale.",
    heroBgClass: "bg-delight-hero dark:bg-delight-hero-dark",
    description: "Premium apparel brand specializing in custom-designed t-shirts and merchandise. Delight Tees needed a digital storefront that matched the quality and personality of their products.",
    challenges: "Needed a modern e-commerce platform with inventory management, secure payments, and a seamless shopping experience that could handle high-volume seasonal demand.",
    solution: "Built a custom e-commerce platform with Stripe integration, real-time inventory tracking, order management dashboard, and responsive product catalog. Included automated order confirmation emails and an admin panel for the founding team.",
    technologyStack: ["Next.js", "Tailwind CSS", "Supabase", "Vercel"],
    stats: [
      { value: "3×", label: "CONVERSION RATE INCREASE" },
      { value: "40%", label: "REDUCTION IN ABANDONED CARTS" },
      { value: "2 weeks", label: "LAUNCH TURNAROUND" },
    ],
    deliverables: [
      "Custom storefront with product catalog",
      "Stripe payment integration",
      "Real-time inventory dashboard",
      "Order tracking & confirmation system",
      "Mobile-responsive design",
      "Admin management panel",
    ],
    testimonials: [
      {
        quote:
          "“Agunwami Enterprise understood exactly what we needed — a store that felt as premium as our products. The build was fast, the quality was exceptional, and our customers constantly compliment the experience. We saw a significant jump in completed purchases almost immediately after launch.”",
        author: "Chidi Okafor",
        role: "Founder, Delight Tees",
        avatar: "/chidi.png",
        featured: true,
        rating: 5,
      },
      {
        quote:
          "“Managing inventory used to be a nightmare. Now everything is tracked in one place and we get alerts before we run out of stock. The admin panel alone has saved us hours every week.”",
        author: "Amaka Eze",
        role: "Operations Lead, Delight Tees",
        avatar: "/whoweare.jpg",
        rating: 5,
      },
    ],
    status: "ACTIVE",
    link: "/projects/delight-tees",
  },
  { 
    client: false,
    icon: BiChip,
    name: "AE Hub",
    image: "/aehubeco.jpg",
    homeDescription: "Internal platform powering our operations and partnerships",
    projectCategory: "Corporate",
    subtitle: "The operational backbone of Agunwami Enterprise.",
    heroBgClass: "bg-project-hero dark:bg-project-hero-dark",
    description: "Internal platform for project management, partnership coordination, and operational workflows. Centralizes client communications, project tracking, and resource allocation.",
    challenges: "Coordinating multi-disciplinary teams across dispersed partner organizations required a unified digital backbone.",
    solution: "Built AE Hub as a centralized operational nerve center with milestone pipelines, asset management, and live reporting.",
    technologyStack: ["Next.js", "Tailwind CSS", "PostgreSQL", "Flutterwave", "Cloudinary"],
    status: "ACTIVE",
    stats: [
      { value: "100%", label: "INTERNAL WORKFLOW AUTOMATION" },
      { value: "48h", label: "AVERAGE CYCLE REDUCTION" },
      { value: "5+", label: "CORE SYSTEMS UNIFIED" },
    ],
    deliverables: [
      "Project pipeline and milestone tracking",
      "Partnership management and coordination",
      "Resource allocation and planning",
      "Client communication hub",
      "Analytics and reporting dashboard",
      "Document management system",
    ],
    testimonials: [
      {
        quote:
          "“AE Hub has streamlined our operations, improved client communication, and enabled us to manage multiple projects simultaneously with transparency and efficiency.”",
        author: "Agunwami Executive Team",
        role: "Enterprise Operations",
        avatar: "/whoweare.jpg",
        featured: true,
        rating: 5,
      },
    ],
    key: [
      "Project pipeline management",
      "Partnership tracking",
      "Resource allocation",
      "Client communication hub",
      "Analytics dashboard"
    ],
    ecoshort: "The operational backbone of Agunwami Enterprise",
    ecodesc: "AE Hub is our flagship internal platform that powers project management, partnership coordination, and operational workflows. It serves as the central nervous system for all AE initiatives.",
    ecokey: ["Project pipeline and milestone tracking","Partnership management and coordination","Resource allocation and planning","Client communication hub","Analytics and reporting", "Document management system"],
    link: "/projects/aehub",
    impact: "AE Hub has streamlined our operations, improved client communication, and enabled us to manage multiple projects simultaneously with transparency and efficiency."
  },
  { 
    client: false,
    icon: BiCar,
    name: "Mobility Platform",
    image: "/mobilityeco.jpg",
    homeDescription: "Transforming transportation and logistics in emerging markets",
    projectCategory: "Logistics",
    subtitle: "Transforming transportation and logistics in emerging markets.",
    heroBgClass: "bg-project-hero dark:bg-project-hero-dark",
    description: "A comprehensive platform designed to address mobility challenges in emerging markets. This system will connect drivers, riders, and logistics partners in a unified ecosystem.",
    challenges: "Fragmented dispatching, unreliable routing, and offline transaction bottlenecks across suburban routes.",
    solution: "Developing an end-to-end dispatch and telematics platform with offline-capable driver apps, GPS routing, and instant settlements.",
    technologyStack: ["Next.js", "Tailwind CSS", "PostgreSQL", "Google Maps API"],
    status: "IN DEVELOPMENT",
    stats: [
      { value: "10k+", label: "PROJECTED COMMUTER REACH" },
      { value: "40%", label: "ESTIMATED ROUTE EFFICIENCY" },
      { value: "24/7", label: "DISPATCH MONITORING" },
    ],
    deliverables: [
      "Real-time ride matching and tracking",
      "Logistics and delivery management",
      "Driver partner onboarding and management",
      "Payment processing and settlement",
      "Route optimization algorithms",
      "Safety and compliance monitoring",
    ],
    testimonials: [],
    ecoshort: "Transforming transportation and logistics",
    ecodesc: "A comprehensive platform designed to address mobility challenges in emerging markets. This system will connect drivers, riders, and logistics partners in a unified ecosystem.",
    ecokey: ["Real-time ride matching and tracking","Logistics and delivery management","Driver partner onboarding and management","Payment processing and settlement","Route optimization", "Safety and compliance monitoring"],
    link: "/projects/mobility",
    impact: "Expected to improve transportation accessibility, create economic opportunities for drivers, and streamline logistics operations across urban and rural areas."
  },
  { 
    client: false,
    icon: BiDollar,
    name: "Fintech Platform",
    image: "/fintecheco.jpg",
    homeDescription: "Financial infrastructure for underserved communities",
    projectCategory: "Fintech",
    subtitle: "Financial infrastructure for underserved communities.",
    heroBgClass: "bg-project-hero dark:bg-project-hero-dark",
    description: "A digital financial services platform focused on providing accessible banking, payments, and financial tools to individuals and small businesses in emerging ecosystems.",
    challenges: "High barrier to entry for micro-merchants and lack of structured credit tracking in underserved markets.",
    solution: "Architecting a secure ledger and wallet infrastructure with multi-rail payment acceptance and automated merchant reconciliations.",
    technologyStack: ["Next.js", "Tailwind CSS", "PostgreSQL", "Flutterwave", "Stripe"],
    status: "IN DEVELOPMENT",
    stats: [
      { value: "99.9%", label: "SYSTEM UPTIME ARCHITECTURE" },
      { value: "<2s", label: "PAYMENT PROCESSING LATENCY" },
      { value: "Zero", label: "TRANSACTION RECONCILIATION DELAY" },
    ],
    deliverables: [
      "Digital wallet and mobile payments",
      "Peer-to-peer transfers",
      "Merchant payment solutions",
      "Savings and credit products",
      "Financial literacy resources",
      "Transaction analytics",
    ],
    testimonials: [],
    ecoshort: "Financial infrastructure for underserved communities",
    ecodesc: "A digital financial services platform focused on providing accessible banking, payments, and financial tools to individuals and small businesses in emerging ecosystems.",
    ecokey: ["Digital wallet and mobile payments","Peer-to-peer transfers","Merchant payment solutions","Savings and credit products","Financial literacy resources", "Transaction analytics"],
    link: "/projects/fintech",
    impact: "Will increase financial inclusion, reduce transaction costs, and empower individuals and businesses with modern financial tools."
  },
];

/**
 * Helper to look up a project by slug (matching link pathname or name slug).
 */
export function getProjectBySlug(slug: string): ProjectItem | undefined {
  const clean = slug.toLowerCase().replace(/^\/projects\//, "").replace(/[^a-z0-9]/g, "");
  return projects.find((p) => {
    const pSlug = p.link.toLowerCase().replace(/^\/projects\//, "").replace(/[^a-z0-9]/g, "");
    if (pSlug === clean) return true;
    const nameSlug = p.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    return nameSlug === clean;
  });
}