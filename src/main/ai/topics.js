// Topic prompts are deliberately descriptive: the model compares meaning, not
// exact keywords. Keep labels stable because selected topics are stored locally.
const TOPICS = [
  { id: 'programming', label: 'Programming', group: 'Technology', prompt: 'Software development, programming languages, code, debugging, APIs, databases, developer tools, and technical documentation.' },
  { id: 'ai', label: 'AI & machine learning', group: 'Technology', prompt: 'Artificial intelligence, machine learning, language models, neural networks, prompts, model research, and AI tools.' },
  { id: 'data', label: 'Data & analytics', group: 'Technology', prompt: 'Data analysis, dashboards, metrics, statistics, spreadsheets, SQL queries, data visualization, and business intelligence.' },
  { id: 'security', label: 'Cybersecurity', group: 'Technology', prompt: 'Cybersecurity, privacy, threat detection, secure coding, identity protection, vulnerabilities, and security policies.' },
  { id: 'design', label: 'Design & creative', group: 'Technology', prompt: 'Visual design, user experience, product design, illustration, typography, creative tools, and design references.' },
  { id: 'work', label: 'Work & projects', group: 'Career & business', prompt: 'Work tasks, meetings, project planning, professional communication, workplace notes, and business operations.' },
  { id: 'career', label: 'Career & job search', group: 'Career & business', prompt: 'Job applications, resumes, interviews, career development, professional networking, and workplace growth.' },
  { id: 'marketing', label: 'Marketing', group: 'Career & business', prompt: 'Marketing campaigns, brand strategy, audience research, advertising, content marketing, and customer acquisition.' },
  { id: 'sales', label: 'Sales & customers', group: 'Career & business', prompt: 'Sales leads, customer communication, proposals, account planning, negotiation, and customer relationship management.' },
  { id: 'productivity', label: 'Productivity', group: 'Career & business', prompt: 'Personal productivity, task management, workflows, organization systems, focus habits, and time management.' },
  { id: 'finance', label: 'Finance & budgeting', group: 'Money & planning', prompt: 'Personal finance, banking, budgeting, taxes, payments, financial planning, and managing expenses.' },
  { id: 'investing', label: 'Investing & markets', group: 'Money & planning', prompt: 'Investing, stocks, bonds, funds, market news, portfolio research, retirement accounts, and asset allocation.' },
  { id: 'shopping', label: 'Shopping & products', group: 'Money & planning', prompt: 'Products to buy, product comparisons, prices, stores, wish lists, deals, and purchase decisions.' },
  { id: 'research', label: 'Research & papers', group: 'Knowledge', prompt: 'Research papers, academic notes, evidence, experiments, citations, study materials, and factual investigation.' },
  { id: 'learning', label: 'Learning & courses', group: 'Knowledge', prompt: 'Learning goals, tutorials, course notes, explanations, study guides, skill building, and educational resources.' },
  { id: 'writing', label: 'Writing & editing', group: 'Knowledge', prompt: 'Writing drafts, editing, grammar, outlines, publishing, storytelling, and communication ideas.' },
  { id: 'news', label: 'News & current events', group: 'Knowledge', prompt: 'News articles, current events, public affairs, policy updates, world events, and timely reporting.' },
  { id: 'legal', label: 'Legal & contracts', group: 'Knowledge', prompt: 'Legal information, contracts, clauses, compliance, regulations, terms of service, and policy documents.' },
  { id: 'personal', label: 'Personal notes', group: 'Everyday life', prompt: 'Personal reminders, life planning, useful notes, goals, and information to keep for later.' },
  { id: 'health', label: 'Health & wellness', group: 'Everyday life', prompt: 'Health and wellness information, appointments, fitness, wellbeing, nutrition, and healthy routines.' },
  { id: 'cooking', label: 'Food & cooking', group: 'Everyday life', prompt: 'Recipes, cooking techniques, ingredients, meal planning, restaurants, and food preferences.' },
  { id: 'home', label: 'Home & DIY', group: 'Everyday life', prompt: 'Home projects, repairs, interior ideas, gardening, household organization, and do-it-yourself instructions.' },
  { id: 'family', label: 'Family & caregiving', group: 'Everyday life', prompt: 'Family schedules, caregiving, school information, family activities, and plans for loved ones.' },
  { id: 'travel', label: 'Travel & places', group: 'Everyday life', prompt: 'Travel plans, destinations, flights, hotels, directions, itineraries, and places to visit.' },
  { id: 'entertainment', label: 'Books & entertainment', group: 'Everyday life', prompt: 'Books, movies, music, games, shows, hobbies, reviews, and entertainment recommendations.' },
  { id: 'realestate', label: 'Real estate', group: 'Money & planning', prompt: 'Homes and property, real estate listings, rentals, mortgages, neighborhoods, and property research.' },
];

module.exports = { TOPICS };
