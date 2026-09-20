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
    subtitle: "Digital infrastructure for a movement.",
    heroBgClass: "bg-trendora-hero dark:bg-trendora-hero-dark",
    description: "Modern retail platform offering curated fashion and lifestyle products. Trendora needed infrastructure that could support multiple vendors while maintaining a cohesive brand experience for shoppers.",
    challenges: "Needed a scalable retail platform with inventory management and multi-vendor support — existing solutions were either too expensive or too limited for their specific needs.",
    solution: "Created a feature-rich retail platform with product catalogs, vendor dashboards, order tracking, and analytics to optimize sales performance. Each vendor gets their own management interface while shoppers see one unified storefront.",
    technologyStack: ["React", "Express", "MongoDB", "Cloudinary"],
    stats: [
      { value: "15+", label: "VENDORS ONBOARDED AT LAUNCH" },
      { value: "2×", label: "MONTHLY GMV GROWTH" },
      { value: "98%", label: "VENDOR SATISFACTION RATE" },
    ],
    deliverables: [
      "Unified customer-facing storefront",
      "Multi-vendor product management",
      "Vendor performance dashboards",
      "Order tracking for customers",
      "Cloudinary media pipeline",
      "Sales analytics and reporting",
    ],
    testimonials: [
      {
        quote:
          "“What AE built for us is not just a store — it is an ecosystem. Our vendors have their own dashboards, our customers get a seamless experience, and I have full visibility into how the business is performing. The growth since launch has been remarkable.”",
        author: "Agunwami",
        role: "CEO, Trendora Store",
        avatar: "/agunwami_trendora.png",
        featured: true,
        rating: 5,
      },
      {
        quote:
          "“As a vendor, I can upload products, track orders, and see my earnings all from one simple dashboard. Setting up was painless and their support during onboarding was excellent.”",
        author: "Aisha Al-Hassan",
        role: "Vendor Partner, Trendora",
        avatar: "/aisha.png",
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
    subtitle: "Enterprise credibility meets digital precision.",
    heroBgClass: "bg-meridian-hero dark:bg-meridian-hero-dark",
    description: "Professional services firm providing business consulting and strategic advisory solutions to mid-market and enterprise clients. Meridian Crest needed a digital presence that commanded the room.",
    challenges: "Required a professional web presence with service showcasing and client management capabilities that matched the gravitas of the brands they serve.",
    solution: "Delivered a corporate website with CMS integration, service portfolio management, client testimonials, and a lead capture system with automated follow-up sequences. Built for long-term content ownership.",
    technologyStack: ["Next.js", "TypeScript", "Sanity CMS", "Motion"],
    stats: [
      { value: "4×", label: "QUALIFIED INBOUND LEADS" },
      { value: "70%", label: "REDUCTION IN MANUAL FOLLOW-UP" },
      { value: "100%", label: "CONTENT MANAGED BY THEIR TEAM" },
    ],
    deliverables: [
      "Corporate website with animated sections",
      "Sanity CMS for content ownership",
      "Service portfolio with case study pages",
      "Lead capture and CRM integration",
      "Team and leadership profiles",
      "Automated inquiry follow-up system",
    ],
    testimonials: [
      {
        quote:
          "“Our old site was embarrassing to share with prospects. Now when we send someone to our website, it closes deals before we even get on a call. AE translated our brand positioning into a digital experience that genuinely reflects the level we operate at.”",
        author: "Marcus Okonkwo",
        role: "Managing Director, Meridian Crest Solutions",
        avatar: "/marcus.png",
        featured: true,
        rating: 5,
      },
      {
        quote:
          "“The CMS is a game changer. Our team publishes case studies and updates without touching code. Inbound quality has improved dramatically — prospects already know who we are before we speak.”",
        author: "Sophia Chen",
        role: "Business Development, Meridian Crest",
        avatar: "/sophia.png",
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
    image: "/delighthero.png",
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
    homeDescription: "Interactive educational platform powering online learning, digital classrooms, and student success",
    projectCategory: "Education",
    subtitle: "The educational and operations backbone of Agunwami Enterprise.",
    heroBgClass: "bg-project-hero dark:bg-project-hero-dark",
    description: "Educational platform designed for interactive online learning, structured coursework, progress tracking, and student certification.",
    challenges: "Delivering resilient digital learning tools and multimedia course delivery across emerging markets with varied connectivity.",
    solution: "Built AE Hub with offline-ready video delivery, interactive quizzes, automated grading, and integrated certificate generation.",
    technologyStack: ["Next.js", "Tailwind CSS", "PostgreSQL", "Flutterwave", "Cloudinary"],
    status: "ACTIVE",
    stats: [
      { value: "100%", label: "COURSE COMPLETION ARCHITECTURE" },
      { value: "24/7", label: "STUDENT ACCESSIBILITY" },
      { value: "5+", label: "CORE LEARNING TRACKS" },
    ],
    deliverables: [
      "Online course management and streaming",
      "Interactive learning resources and syllabus",
      "Student certification engine",
      "Live tutor and virtual classrooms",
      "Student progress analytics dashboard",
      "Community discussion forums",
    ],
    testimonials: [
      {
        quote:
          "“AE Hub has completely transformed how students and instructors connect, providing a structured, modern learning environment accessible anywhere.”",
        author: "Agunwami Executive Team",
        role: "Enterprise Education",
        avatar: "/whoweare.jpg",
        featured: true,
        rating: 5,
      },
    ],
    key: [
      "Online course management",
      "Interactive learning resources",
      "Student certification engine",
      "Live tutor and virtual classrooms",
      "Progress analytics"
    ],
    ecoshort: "Educational platform empowering digital skills",
    ecodesc: "AE Hub is our flagship educational platform designed to provide practical, accessible technology courses, certifications, and career skills for the next generation of builders.",
    ecokey: ["Online course management","Interactive learning resources","Student certification engine","Live tutor and virtual classrooms","Progress analytics", "Community forums"],
    link: "/projects/aehub",
    impact: "Empowering thousands of students and career switchers with verified digital skills, career pathways, and mentorship."
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
    name: "AE Workstation",
    image: "/fintecheco.jpg",
    homeDescription: "Online office workspace and enterprise operations hub",
    projectCategory: "Operations",
    subtitle: "Enterprise collaboration and productivity workspace.",
    heroBgClass: "bg-project-hero dark:bg-project-hero-dark",
    description: "A centralized digital workplace powering internal operations, project tracking, real-time collaboration, and administrative governance for modern distributed teams.",
    challenges: "Disconnected communication channels, fragmented task tracking, and lack of real-time operational oversight across team departments.",
    solution: "Built an all-in-one workstation unifying staff management, shift tracking, financial logging, project boards, and client collaboration.",
    technologyStack: ["Next.js", "TypeScript", "Tailwind CSS", "Firebase", "LiveKit"],
    status: "ACTIVE",
    stats: [
      { value: "99.9%", label: "SYSTEM AVAILABILITY" },
      { value: "100%", label: "REMOTE TEAM ALIGNMENT" },
      { value: "<1s", label: "REAL-TIME SYNC LATENCY" },
    ],
    deliverables: [
      "Unified team directory and role-based permissions",
      "Real-time task tracking and workflow automation",
      "Interactive time tracking and attendance",
      "Live conferencing and communication tools",
      "Executive analytics and financial reporting",
      "Document and resource repository",
    ],
    testimonials: [],
    ecoshort: "Online office workspace and operations hub",
    ecodesc: "A centralized digital workplace powering internal operations, project tracking, real-time collaboration, and administrative governance for modern distributed teams.",
    ecokey: [
      "Unified team directory and role-based permissions",
      "Real-time task tracking and workflow automation",
      "Interactive time tracking and attendance",
      "Live conferencing and communication tools",
      "Executive analytics and financial reporting",
      "Document and resource repository",
    ],
    link: "/ceo",
    impact: "Unifying operations, automating administrative tasks, and fostering seamless teamwork across teams."
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