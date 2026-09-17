export type ArticleCategory =
  | "Infrastructure"
  | "Design"
  | "Technology"
  | "Partnerships"
  | "Insights";

export interface ArticleSection {
  heading: string;
  body: string[];
}

export interface Article {
  id: number;
  title: string;
  category: ArticleCategory;
  excerpt: string;
  date: string;
  readTime: string;
  author: string;
  authorRole: string;
  authorImage: string;
  image: string;
  slug: string;
  intro: string;
  sections: ArticleSection[];
  pullQuote: string;
}

export const ARTICLES: Article[] = [
  {
    id: 1,
    title: "Building Scalable Platforms for Long-Term Impact",
    category: "Infrastructure",
    excerpt:
      "Exploring the core principles of building digital platforms that scale with purpose and deliver sustainable impact.",
    date: "May 15, 2025",
    readTime: "8 min read",
    author: "Agunwami .O.",
    authorRole: "Chief Executive Officer",
    authorImage: "/agunwami_ceo.jpg",
    image: "/insight_infra.jpg",
    slug: "building-scalable-platforms-for-long-term-impact",
    intro:
      "Scaling isn't just about handling more users. It's about designing systems that maintain clarity, purpose, and reliability as your organization evolves. The platforms that endure are the ones built on intentional architecture—where every decision from day one is made with tomorrow's demands in mind.",
    pullQuote:
      "The organizations that win don't just build products. They build systems that adapt, endure, and continue creating value long after the initial launch.",
    sections: [
      {
        heading: "1. Separate concerns from day one",
        body: [
          "Monolithic applications feel convenient at first, but they become bottlenecks the moment a team tries to move faster. Separating your presentation layer from your business logic, and your business logic from your data access layer, makes it possible to scale each independently without touching the others.",
          "In practice, this means defining clear service boundaries early, even if you start with a single codebase. Think in terms of domains—user identity, billing, content, notifications—and resist the urge to tangle them together for short-term convenience.",
        ],
      },
      {
        heading: "2. Design your data model like it has to last a decade",
        body: [
          "Data outlives code. The schema decisions you make today will constrain what you can build in year three, year five, and beyond. This is why modeling your data with extensibility in mind isn't a luxury—it's a survival strategy.",
          "Avoid hard-coding status fields, boolean flags, and category enumerations directly into your schema. Instead, use flexible structures like JSON columns with defined schemas, or separate lookup tables that can be extended without migrations that touch millions of rows.",
        ],
      },
      {
        heading: "3. Build for operations, not just features",
        body: [
          "Shipping features is what gets celebrated; operating them reliably at scale is what builds trust. Observability—meaningful logs, distributed tracing, and real-time dashboards—should be treated as a first-class requirement, not an afterthought.",
          "There is a meaningful difference between a platform that works and one that is understood. Teams that invest in operational clarity catch incidents faster, resolve them with less drama, and build systems that improve instead of decay over time.",
        ],
      },
      {
        heading: "4. Treat your abstractions like a product",
        body: [
          "Internal tools, shared libraries, and platform abstractions have users: your engineering team. Apply the same product thinking to your internal infrastructure that you apply to your external features. Document it. Version it. Gather feedback on it. Deprecate things deliberately.",
          "Organizations that treat their platform layer as a living product consistently outperform those that treat it as a collection of utilities someone will clean up 'eventually.'",
        ],
      },
      {
        heading: "5. Document your system, not just your assets",
        body: [
          "Architecture decisions, not just API endpoints, need documentation. An Architecture Decision Record (ADR) is a lightweight practice where you record why a decision was made, what alternatives were considered, and what the trade-offs are.",
          "This institutional knowledge is what allows a new engineer to ramp up without tearing down what the team built. It's also what prevents the same debates from happening every six months when people forget the context of past decisions.",
        ],
      },
    ],
  },
  {
    id: 2,
    title: "Design Systems: The Backbone of Consistent Experiences",
    category: "Design",
    excerpt:
      "How design systems help teams ship faster, maintain consistency, and create better user experiences across platforms.",
    date: "May 08, 2025",
    readTime: "6 min read",
    author: "Aisha Y.",
    authorRole: "Project Manager",
    authorImage: "/aisha_pm.jpg",
    image: "/insight_design.jpg",
    slug: "design-systems-the-backbone-of-consistent-experiences",
    intro:
      "A design system is not a component library. That distinction matters. A component library is a collection of building blocks. A design system is a shared language—values, decisions, and patterns agreed upon across an organization—that turns independent contributors into a cohesive team.",
    pullQuote:
      "A great design system doesn't constrain creativity—it channels it. Teams spend less time reinventing the wheel and more time building meaningful experiences.",
    sections: [
      {
        heading: "The case for shared language",
        body: [
          "When designers and engineers speak different languages, products look like they were assembled by strangers. Buttons have four different border-radii. Spacing feels inconsistent. Colors drift between screens. These aren't cosmetic problems—they erode user trust.",
          "A design system resolves this by codifying intent: here is what a primary action looks like, here is how we treat destructive actions, here is our typographic hierarchy. This shared contract means every new feature starts from the same baseline.",
        ],
      },
      {
        heading: "Tokens as the foundation",
        body: [
          "Design tokens—named values for colors, spacing, typography, elevation, and motion—are the atomic unit of a design system. Defining your tokens before you build components is the practice that separates systems that scale from ones that require constant patching.",
          "When you change a brand color, you update one token. Every component that references it inherits the change automatically. That is the power of working at the right level of abstraction.",
        ],
      },
      {
        heading: "Documentation is not optional",
        body: [
          "A design system without documentation is just a pile of components. The documentation is where intent lives: when to use this component, when not to, what accessibility requirements it satisfies, how to extend it responsibly.",
          "The organizations that get the most from their design systems invest in documentation as a continuous practice, not a one-time effort.",
        ],
      },
    ],
  },
  {
    id: 3,
    title: "The Future of Digital Infrastructure",
    category: "Technology",
    excerpt:
      "Key trends shaping the future of digital infrastructure and what forward-looking organizations should prepare for today.",
    date: "May 01, 2025",
    readTime: "7 min read",
    author: "Chris Hayes",
    authorRole: "R&D Director",
    authorImage: "/chris_hayes.jpg",
    image: "/meridian.jpg",
    slug: "the-future-of-digital-infrastructure",
    intro:
      "The organizations that will define the next decade are not those reacting to infrastructure trends—they are those anticipating them. The shift from reactive to proactive infrastructure strategy is arguably the most important organizational capability a technology-forward enterprise can build right now.",
    pullQuote:
      "Infrastructure is not a cost center. It is a competitive advantage—when you treat it as one.",
    sections: [
      {
        heading: "Edge computing changes the calculus",
        body: [
          "The centralized data center model served us well for decades. But as applications become more latency-sensitive—real-time collaboration, AI inference at the point of interaction, IoT at scale—compute needs to move closer to users.",
          "Edge computing is not replacing the cloud; it is complementing it. Organizations that learn to route workloads intelligently between centralized and edge resources will have meaningful performance and cost advantages.",
        ],
      },
      {
        heading: "Observability becomes the operating model",
        body: [
          "The next generation of infrastructure is too distributed to operate through intuition. Distributed tracing, semantic logging, and continuous profiling are becoming standard expectations, not advanced practices.",
          "The teams investing in observability platforms now are building the operational muscle that will let them operate complex systems with confidence—and recover from incidents faster when things go wrong.",
        ],
      },
      {
        heading: "Platform engineering as a discipline",
        body: [
          "The rise of platform engineering—teams that build internal developer platforms to abstract away infrastructure complexity—reflects a growing recognition that developer experience is a force multiplier.",
          "When application engineers can deploy, observe, and iterate without needing deep infrastructure expertise, the organization ships faster.",
        ],
      },
    ],
  },
  {
    id: 4,
    title: "Strategic Partnerships That Drive Transformation",
    category: "Partnerships",
    excerpt:
      "Why the right partnerships can accelerate growth, foster cross-sector innovation, and drive positive community impact.",
    date: "Apr 24, 2025",
    readTime: "5 min read",
    author: "Japhet Marshall",
    authorRole: "Operation Manager",
    authorImage: "/japhet_coo.jpg",
    image: "/applyhero.jpg",
    slug: "strategic-partnerships-that-drive-transformation",
    intro:
      "Organizations rarely transform alone. The most significant shifts—in capability, reach, and impact—happen when organizations combine complementary strengths with shared commitments. Partnership is not a transactional arrangement; it is a strategic posture.",
    pullQuote:
      "The right partnership doesn't just expand what you can do today. It changes what you're capable of becoming.",
    sections: [
      {
        heading: "Alignment before agreement",
        body: [
          "The partnerships that fail most visibly are those built on contractual obligation without strategic alignment. Parties optimize for their own metrics, interpret ambiguous terms differently, and eventually find themselves pulling in opposite directions.",
          "Before a partnership is formalized, the most important work is establishing shared definitions of success—not just shared goals, but shared measures, timelines, and escalation paths when things don't go as planned.",
        ],
      },
      {
        heading: "Cross-sector partnerships amplify impact",
        body: [
          "Technology organizations partnering with community institutions, educational bodies, or government entities often access channels, trust, and context that would take years to build independently.",
          "These combinations, when structured well, deliver outcomes neither partner could achieve alone—and they tend to be more durable because both sides have genuine stakes in the result.",
        ],
      },
    ],
  },
  {
    id: 5,
    title: "Data-Driven Decisions for Smarter Systems",
    category: "Technology",
    excerpt:
      "How leveraging real-time data insights helps organizations make smarter decisions and build more effective, resilient systems.",
    date: "Apr 10, 2025",
    readTime: "6 min read",
    author: "Jesse A.",
    authorRole: "Technology Officer",
    authorImage: "/team_placeholder.jpg",
    image: "/whatwedo.jpg",
    slug: "data-driven-decisions-for-smarter-systems",
    intro:
      "Data-driven is one of the most overused phrases in technology. What it actually means—in practice, not in aspiration—is that decisions at every level of your organization are informed, challenged, and validated by evidence. That is harder than it sounds.",
    pullQuote:
      "The goal isn't more data. It's better questions—and the infrastructure to answer them quickly.",
    sections: [
      {
        heading: "Start with the decision, not the data",
        body: [
          "Many organizations build data infrastructure without first defining what decisions they need to make. The result is warehouses full of data that nobody queries, dashboards nobody trusts, and reports nobody reads.",
          "The inverse approach—starting with the decisions that matter most, then working backward to the data and tools required to inform them—consistently produces more useful analytics infrastructure.",
        ],
      },
      {
        heading: "Real-time vs. batch: the right answer depends on the question",
        body: [
          "Not every business question needs a real-time answer, and not every operational question can tolerate a 24-hour lag. Building a data architecture that can serve both streaming and batch use cases is a meaningful engineering challenge.",
          "The teams that get this right invest early in platform abstractions that hide the complexity of the underlying processing model from analysts and application developers.",
        ],
      },
    ],
  },
  {
    id: 6,
    title: "From Strategy to Execution: Bridging the Gap",
    category: "Insights",
    excerpt:
      "Turning ambitious ideas into concrete results with clear strategies, actionable roadmaps, and measurable mission outcomes.",
    date: "Apr 17, 2025",
    readTime: "5 min read",
    author: "Agunwami .O.",
    authorRole: "Chief Executive Officer",
    authorImage: "/agunwami_ceo.jpg",
    image: "/built.jpg",
    slug: "from-strategy-to-execution-bridging-the-gap",
    intro:
      "The gap between a compelling strategy and its successful execution is where most organizational ambitions quietly expire. It's not that the strategies are wrong. It's that the translation from intent to action—from slide to system, from goal to behavior—is harder than any strategy document acknowledges.",
    pullQuote:
      "Execution is not the implementation of strategy. It is strategy, made real, one decision at a time.",
    sections: [
      {
        heading: "Strategy is a hypothesis, not a plan",
        body: [
          "Treating a strategic plan as a fixed document to be executed is one of the most reliable ways to guarantee mediocre outcomes. Markets change. Technology changes. The competitive landscape shifts. A strategy that doesn't build in learning cycles will be wrong by the time it matters.",
          "The organizations that execute well treat strategy as a continuously tested hypothesis—directionally committed but tactically adaptive.",
        ],
      },
      {
        heading: "The translation layer between strategy and operations",
        body: [
          "Between the executive strategy and the individual contributor's daily work, there is often a translation gap. Mid-level leaders who understand both the strategic intent and the operational reality are the people who close that gap.",
          "Investing in the capability of this layer—through clarity, context, and decision-making frameworks—is one of the highest-leverage organizational investments any leadership team can make.",
        ],
      },
    ],
  },
];

export const CATEGORIES = [
  "All",
  "Infrastructure",
  "Design",
  "Technology",
  "Partnerships",
  "Insights",
] as const;
