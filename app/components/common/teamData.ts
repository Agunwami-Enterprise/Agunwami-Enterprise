export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image: string;
  linkedin: string;
}

export const defaultTeam: TeamMember[] = [
  {
    name: "Agunwami .O.",
    role: "Chief Executive Officer",
    bio: "Visionary leader with over 12 years of experience in digital strategy, business development, and platform innovation.",
    image: "/agunwami_ceo.jpg",
    linkedin: "https://www.linkedin.com/company/agunwami-enterprises/",
  },
  {
    name: "Japhet Marshall",
    role: "Operation Manager",
    bio: "A strategist with expertise in systems architecture, process optimization, and organizational excellence.",
    image: "/japhet_coo.jpg",
    linkedin: "https://www.linkedin.com/company/agunwami-enterprises/",
  },
  {
    name: "Jesse A.",
    role: "Technology Officer",
    bio: "Full-stack technologist with deep expertise in cloud infrastructure, platform engineering, and scalability.",
    image: "/team_placeholder.jpg",
    linkedin: "https://www.linkedin.com/company/agunwami-enterprises/",
  },
  {
    name: "Aisha Y.",
    role: "Project Manager",
    bio: "Agile delivery specialist ensuring complex digital projects launch seamlessly on time, within scope, and at peak quality.",
    image: "/aisha_pm.jpg",
    linkedin: "https://www.linkedin.com/company/agunwami-enterprises/",
  },
  {
    name: "Chris Hayes",
    role: "Research & Development Director",
    bio: "Pioneering technological exploration and architectural roadmaps for sustainable, next-generation digital ecosystems.",
    image: "/chris_hayes.jpg",
    linkedin: "https://www.linkedin.com/company/agunwami-enterprises/",
  },
];
