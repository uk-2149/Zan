export const LANDING_CONTENT = {
  hero: {
    badge: " Built on Solana",
    headline: "Brilliant Compute\nBehind Brilliant AI.",
    subheadline:
      "Access a decentralized network of high-performance GPUs-ready to power your AI inference and rendering tasks with speed and low cost.",
    ctaPrimary: "I Need Compute",
    ctaSecondary: "List My GPU",
  },
  ticker: [
    "Solana",
    "NVIDIA",
    "Docker",
    "PyTorch",
    "HuggingFace",
    "Ubuntu",
    "TensorFlow",
    "CUDA",
  ],
  problem: {
    tagline: "THE PROBLEM",
    headline: "Cloud Monopolies = Stifled AI",
    subheadline:
      "80% of AI builders struggle with GPU shortages and exorbitant AWS/GCP pricing. Here is why centralized compute fails.",
    cards: [
      {
        id: "01",
        title: "Cost Prohibitive",
        description:
          "Centralized clouds mark up GPU pricing by 400%, bleeding startup runways dry.",
      },
      {
        id: "02",
        title: "Zero Availability",
        description:
          "Waiting weeks for H100s or RTX 4090s limits iteration and kills momentum.",
      },
      {
        id: "03",
        title: "Wasted Global Resources",
        description:
          "Millions of consumer and gaming GPUs sit idle 90% of the day.",
      },
    ],
  },
  solution: {
    tagline: "OUR SOLUTION",
    headline: "Decentralized execution for your AI tasks",
    subheadline:
      "Not a traditional cloud. We built an orchestration layer to reliably source, structure, and scale idle GPU power globally.",
    cards: [
      {
        title: "Elite Hardware",
        description:
          "Access RTX 3090s, 4090s, and A100s globally from verified providers.",
      },
      {
        title: "Solana Escrow",
        description:
          "Trustless, sub-cent payments. You only pay when the task is verified.",
      },
      {
        title: "Docker Sandboxing",
        description:
          "Secure, isolated execution environments for your models and scripts.",
      },
    ],
  },
  process: {
    tagline: "HOW IT WORKS",
    headline: "From Brief to Delivery",
    subheadline:
      "A streamlined protocol designed for speed without sacrificing security.",
    steps: [
      {
        id: "01",
        title: "Define Requirements",
        description:
          "Tell us your VRAM needs, budget, and job type (Inference, Render).",
        bullets: [
          "Hardware constraint matching",
          "Budget ceiling setup",
          "Region preferences",
        ],
      },
      {
        id: "02",
        title: "Fund Escrow",
        description:
          "Funds are securely locked on-chain instantly via USDC or SOL.",
        bullets: [
          "Smart contract generation",
          "Cryptographic lock",
          "Zero-trust verification",
        ],
      },
      {
        id: "03",
        title: "Smart Match",
        description:
          "Our engine pairs your job with the optimal, verified GPU node based on latency and reputation.",
        bullets: [
          "Reputation scoring",
          "Latency optimization",
          "Node availability check",
        ],
      },
      {
        id: "04",
        title: "Sandboxed Execution",
        description:
          "The node downloads your container, processes the job securely, and uploads the output.",
        bullets: [
          "Docker isolation",
          "Real-time log tracking",
          "Encrypted payloads",
        ],
      },
      {
        id: "05",
        title: "Verification & Payout",
        description:
          "Output is verified, you receive the results, and the node is paid automatically.",
        bullets: [
          "Output hash validation",
          "Automated settlement",
          "Reputation update",
        ],
      },
    ],
  },
  whyZan: {
    tagline: "SCALE & PERFORMANCE",
    headline: "Scale That Speaks for Itself",
    subheadline:
      "Zan is not just a marketplace. It is a decentralized operating system engineered to seamlessly scale your AI workloads globally.",
    stats: [
      {
        id: 1,
        value: "15K+",
        label: "Verified Global GPUs",
        description: "From RTX 4090s to H100 clusters.",
      },
      {
        id: 2,
        value: "< 2s",
        label: "Average Match Time",
        description: "Fastest routing in the Web3 space.",
      },
      {
        id: 3,
        value: "-70%",
        label: "Cost vs. AWS/GCP",
        description: "Eliminating centralized cloud markups.",
      },
      {
        id: 4,
        value: "99.9%",
        label: "Uptime SLA",
        description: "Redundant node failover protocols.",
      },
    ],
  },
  security: {
    tagline: "ENTERPRISE-GRADE",
    headline: "Cryptographic Isolation",
    subheadline:
      "Built for sensitive, high-stakes AI workloads. Your models, weights, and training data remain strictly confidential.",
    features: [
      {
        title: "Docker Sandboxing",
        description:
          "Complete firm-level separation. Your code runs in a highly restricted, ephemeral container.",
      },
      {
        title: "Trustless Settlement",
        description:
          "Solana smart contracts handle the money. Escrow is only released upon verified execution.",
      },
      {
        title: "Zero-Trace Wipe",
        description:
          "Nodes are strictly forced to wipe all VRAM, RAM, and disk space immediately after job completion.",
      },
      {
        title: "Encrypted Payloads",
        description:
          "Zero external access allowed during execution. All inputs and outputs are encrypted end-to-end.",
      },
    ],
  },
};
