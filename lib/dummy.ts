import { BiUser, BiShoppingBag, BiStore, BiChip, BiCar, BiDollar, BiBuilding, BiTrendingUp } from "react-icons/bi";
import { LuUsers, LuBriefcase, LuLayers, LuDatabase, LuShield, LuShieldCheck, LuZap, LuCreditCard } from "react-icons/lu";
import { BsFillBagFill } from "react-icons/bs";
import {
  RiHeartFill,
  RiShieldLine,
  RiLightbulbLine,
  RiHeartLine,
  RiUserLine,
  RiFocus3Line,
  RiStackshareLine,
} from "react-icons/ri";
import { FaBolt, FaUsers } from "react-icons/fa";
import { PiPlant } from "react-icons/pi";
import { CgMail } from "react-icons/cg";

import { BiPhone } from "react-icons/bi";
import { FaLocationPin } from "react-icons/fa6";
import { type IconType } from "react-icons";

// ─────────────────────────────────────────────
// HOME PAGE DATA
// ─────────────────────────────────────────────

export const whatYouGain = [
  {
    title: "Enterprise-Grade Solutions",
    description:
      "Build secure, high-performance software designed to support growing businesses, startups, and large nonprofit organizations.",
  },
  {
    title: "Faster Time to Market",
    description:
      "Move from idea to launch with an experienced team that delivers efficiently without compromising quality.",
  },
  {
    title: "Scalable Technology",
    description:
      "Create digital products that grow with your business, support more users, and adapt to changing market demands.",
  },
  {
    title: "AI & Automation",
    description:
      "Reduce manual work and improve decision-making with intelligent automation and AI-powered business solutions.",
  },
  {
    title: "Long-Term Technology Partnership",
    description:
      "Beyond development, we provide continuous support, optimization, and innovation to help your technology evolve.",
  },
  {
    title: "Business-Driven Results",
    description:
      "Every solution is built to improve efficiency, increase productivity, reduce operational costs, and create sustainable growth.",
  },
];

export const whatWeDo = [
  {
    title: "Digital Solutions",
    description:
      "Build secure, scalable, and user-focused digital solutions, including web applications, mobile apps, enterprise software, cloud systems, and AI-powered business tools that solve complex operational challenges.",
  },
  {
    title: "Platform Development",
    description:
      "Develop custom digital platforms that connect users, automate workflows, enable secure transactions, and support sustainable growth across industries.",
  },
  {
    title: "AI & Business Automation",
    description:
      "Automate repetitive processes, improve decision-making, and increase productivity through artificial intelligence, workflow automation, and intelligent business systems.",
  },
  {
    title: "Technology Consulting",
    description:
      "Help organizations define digital strategies, modernize legacy systems, validate product ideas, and implement technology solutions that align with long-term business goals.",
  },
  {
    title: "Impact & Partnerships",
    description:
      "Collaborate with startups, NGOs, enterprises, investors, and innovation partners to deliver technology-driven initiatives that create measurable economic and social impact.",
  },
];

export const ourServices = [
  { title: "Website Development", href: "/services#website-development" },
  { title: "Platform Systems", href: "/services#platform-systems" },
  { title: "Admin Dashboards", href: "/services#admin-dashboards" },
  { title: "Membership Systems", href: "/services#membership-systems" },
  { title: "Workflow Automation", href: "/services#workflow-automation" },
  { title: "Payment Integration", href: "/services#payment-integration" },
  { title: "Security Audits", href: "/services#platform-systems" },
  { title: "API Development", href: "/services#platform-systems" },
  { title: "UI Architecture", href: "/services#core-values" },
  { title: "Scalability Planning", href: "/services#core-values" },
  { title: "System Integration", href: "/services#core-values" },
];

export const aeEcosystemCards = [
  {
    title: "AE Hub",
    description:
      "Interactive educational platform powering online learning, digital classrooms, and student success",
    status: "ACTIVE",
  },
  {
    title: "Mobility Platform",
    description: "Transportation and logistics infrastructure",
    status: "COMING SOON",
  },
  {
    title: "AE Workstation",
    description: "Online office workspace and enterprise operations hub",
    status: "ACTIVE",
  },
];

export const howWeWork = [
  {
    title: "Discovery & Planning",
    description:
      "We start by understanding your mission, goals, and requirements to structure a clear roadmap.",
  },
  {
    title: "Design & Development",
    description:
      "Our team builds your platform with modern technology, clean UI systems, and scalable architecture.",
  },
  {
    title: "Launch & Support",
    description:
      "We deliver your platform and provide ongoing maintenance, updates, and strategic guidance.",
  },
];

// ─────────────────────────────────────────────
// SERVICES PAGE DATA
// ─────────────────────────────────────────────

export const coreServices = [
  {
    id: "website-development",
    icon: LuLayers,
    title: "Website Development",
    description:
      "custom, responsive websites built on modern tech stacks and optimized for speed, SEO, and conversions.",
  },
  {
    id: "platform-systems",
    icon: LuDatabase,
    title: "Platform Systems",
    description:
      "Scalable digital infrastructure, APIs, Integrations, and backend architecture built to support growth.",
  },
  {
    id: "admin-dashboards",
    icon: LuShield,
    title: "Admin Dashboards",
    description:
      "Intuitive admin interfaces with real-time reporting, data visualization, and role-based access control.",
  },
  {
    id: "membership-systems",
    icon: LuShieldCheck,
    title: "Membership Systems",
    description:
      "Full membership platforms with secure authentication, member directories, tiered access, and engagement tools.",
  },
  {
    id: "workflow-automation",
    icon: LuZap,
    title: "Workflow Automation",
    description:
      "Automate repetitive processes with smart workflows, email triggers, and operational efficiency built in.",
  },
  {
    id: "payment-integration",
    icon: LuCreditCard,
    title: "Payment Integration",
    description:
      "Secure, PCI-compliant payment processing with subscription billing and transparent transaction reporting.",
  },
];

export const builtForSuccess = [
  {
    title: "We Build for Scale",
    description:
      "Every system we design grows with your organization, ensuring seamless scalability and long-term performance.",
  },
  {
    title: "Transparency-First",
    description:
      "Clear communication, honest timelines, and collaborative decision-making at every stage of your project.",
  },
  {
    title: "Impact-Driven",
    description:
      "We measure success by the real-world results our platforms deliver for your business and your users.",
  },
  {
    title: "Execution Excellence",
    description:
      "Clean code, thoughtful design, and rigorous quality standards in everything we deliver.",
  },
];

export const servicesDetailCards = [
  {
    number: "01",
    title: "Requirements",
    title2: "Structuring",
    description:
      "We translate ambiguous goals into clear, actionable specifications through technical discovery, requirements documentation, architecture planning, and stakeholder alignment.",
    list: [
      "Technical discovery sessions",
      "System requirements documentation",
      "Architecture planning",
      "Stakeholder alignment",
    ],
  },
  {
    number: "02",
    title: "UI",
    title2: "Architecture",
    description:
      "We build scalable design systems and component libraries — including component development, design tokens, pattern documentation, and accessibility compliance.",
    list: [
      "Component library development",
      "Design token systems",
      "Interface pattern documentation",
      "Accessibility compliance",
    ],
  },
  {
    number: "03",
    title: "Dashboard",
    title2: "Development",
    description:
      "We build custom analytics dashboards with real-time data visualization, custom metrics tracking, interactive reporting, and export capabilities.",
    list: [
      "Real-time data visualization",
      "Custom metrics tracking",
      "Interactive reporting",
      "Export capabilities",
    ],
  },
  {
    number: "04",
    title: "Workflow",
    title2: "Modeling",
    description:
      "We map complex business processes into efficient digital workflows through process documentation, automation opportunities, and integration planning.",
    list: [
      "Process documentation",
      "Automation opportunities",
      "Integration planning",
      "Optimization strategies",
    ],
  },
  {
    number: "05",
    title: "Scalability",
    title2: "Planning",
    description:
      "We review architecture and plan infrastructure for growing platforms through performance audits, optimization, load testing, and growth road-mapping.",
    list: [
      "Performance audits",
      "Infrastructure optimization",
      "Load testing",
      "Growth road-mapping",
    ],
  },
  {
    number: "06",
    title: "System",
    title2: "Integration",
    description:
      "We connect your digital ecosystem seamlessly through API development, documentation, legacy system migration, and third-party tool integration.",
    list: [
      "API development & documentation",
      "Legacy system migration",
      "Third-party tool integration",
      "Data synchronization",
    ],
  },
];

// ─────────────────────────────────────────────
// PARTNERSHIPS PAGE DATA
// ─────────────────────────────────────────────

export const partnershipCategories = [
  {
    icon: FaUsers,
    title: "Shared Infrastructure",
    description:
      "Platforms leverage common technology, reducing costs and accelerating development.",
    number: "01",
    partnershipBenefits: [
      "Cross-platform integration opportunities",
      "Access to growing user base",
      "Collaborative innovation pathways",
      "Joint marketing and outreach",
    ],
  },
  {
    icon: PiPlant,
    title: "Integrated Experience",
    description:
      "Users benefit from seamless connections between platforms, creating network effects.",
    number: "02",
    partnershipBenefits: [
      "Cross-platform integration opportunities",
      "Access to growing user base",
      "Collaborative innovation pathways",
      "Joint marketing and outreach",
    ],
  },
  {
    icon: BiBuilding,
    title: "Scalable Impact",
    description:
      "Each platform strengthens the others, multiple value and opportunity across the ecosystem.",
    number: "03",
    partnershipBenefits: [
      "Cross-platform integration opportunities",
      "Access to growing user base",
      "Collaborative innovation pathways",
      "Joint marketing and outreach",
    ],
  },
];

export const partnershipApproach = [
  {
    title: "Collaborative Planning",
    description:
      "We start by understanding your mission, goals, and challenges. Together, we define requirements and map out a clear roadmap.",
  },
  {
    title: "Impact-Driven Development",
    description:
      "We start by understanding your mission, goals, and challenges. Together, we define requirements and map out a clear roadmap.",
  },
  {
    title: "Flexible Engagement",
    description:
      "We start by understanding your mission, goals, and challenges. Together, we define requirements and map out a clear roadmap.",
  },
  {
    title: "Long-Term Partnership",
    description:
      "We start by understanding your mission, goals, and challenges. Together, we define requirements and map out a clear roadmap.",
  },
];

// ─────────────────────────────────────────────
// ECOSYSTEM PAGE DATA
// ─────────────────────────────────────────────

export const whyEcosystem = [
  {
    icon: RiStackshareLine,
    title: "Shared Infrastructure",
    description:
      "Platforms leverage common technology, reducing costs and accelerating development.",
  },
  {
    icon: FaBolt,
    title: "Integrated Experience",
    description:
      "Users benefit from seamless connections between platforms, creating network effects.",
  },
  {
    icon: BiTrendingUp,
    title: "Scalable Impact",
    description:
      "Each platform strengthens the others, multiple value and opportunity across the ecosystem.",
  },
];

// ─────────────────────────────────────────────
// CONTACT PAGE DATA
// ─────────────────────────────────────────────

export interface ContactDetail {
  icon: IconType;
  name: string;
  details: string;
  link?: string;
  text?: string;
}

export const contactDetails: ContactDetail[] = [
  {
    icon: CgMail,
    name: "EMAIL",
    details: "Contact@agunwamienterprise.com",
    link: "mailto:Contact@agunwamienterprise.com",
  },
  {
    icon: BiPhone,
    name: "PHONE",
    details: "+1 (470) 526-0343",
    link: "tel:+14705260343",
  },
  {
    icon: FaLocationPin,
    name: "LOCATION",
    details: "Atlanta, Georgia, US",
    text: "Serving clients globally",
  },
];

// ─────────────────────────────────────────────
// ABOUT PAGE DATA
// ─────────────────────────────────────────────

export interface CoreValue {
  icon: IconType;
  title: string;
  description: string;
}

export const coreValues: CoreValue[] = [
  {
    icon: RiFocus3Line,
    title: "Partnership Over Transactions",
    description:
      "We build long-term relationships, not one-off projects. Your success is our success.",
  },
  {
    icon: RiShieldLine,
    title: "Systems Thinking",
    description:
      "We design for scale, sustainability, and growth—not just immediate needs.",
  },
  {
    icon: RiLightbulbLine,
    title: "Clarity & Transparency",
    description:
      "Clear communication, honest timelines, and collaborative decision-making at every stage.",
  },
  {
    icon: RiHeartLine,
    title: "Impact-Driven Work",
    description:
      "We prioritize projects that create opportunity, empower communities, and drive meaningful change.",
  },
  {
    icon: RiUserLine,
    title: "Execution Excellence",
    description:
      "Clean code, thoughtful design, and rigorous quality standards in everything we deliver.",
  },
];

export const deliveryPhilosophy = [
  {
    title: "No Hidden Complexity",
    description:
      "We break down technical decisions into clear, understandable language so you always know what is happening and why.",
  },
  {
    title: "Milestone-Based Progress",
    description:
      "Work is structured around clear deliverables with regular check-ins, ensuring transparency and accountability.",
  },
  {
    title: "Built to Scale",
    description:
      "Every platform we build is designed for growth, not just launch. We plan for your future, not just today.",
  },
  {
    title: "Your Platform, Your Ownership",
    description:
      "You own everything we build—code, design systems, documentation. No vendor lock-in, ever.",
  },
];

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