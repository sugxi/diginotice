import { Brain, Cloud, Shield, Zap, Eye, Database } from 'lucide-react';

const features = [
  { icon: Brain, title: 'Natural Language Processing', desc: 'Text is processed to extract keywords such as "exam", "urgent", or "submission". Stop words are removed and readability is enhanced automatically.' },
  { icon: Zap, title: 'Priority Classification', desc: 'Notices are classified as Urgent, Important, Normal, or Low based on keyword analysis. Color-coded borders and backgrounds indicate urgency at a glance.' },
  { icon: Eye, title: 'Smart Display', desc: 'Notices are sorted by priority. The most urgent items always appear first, ensuring critical information is never missed.' },
  { icon: Cloud, title: 'Cloud Infrastructure', desc: 'The system uses cloud-based services for database, authentication, and storage — supporting multiple concurrent users seamlessly.' },
  { icon: Shield, title: 'Secure Authentication', desc: 'User login and role-based access ensure that only authorized users can create or manage notices and tasks.' },
  { icon: Database, title: 'Real-time Sync', desc: 'All data is synchronized in real-time across devices. Changes made by one user are instantly visible to others.' },
];

const About = () => {
  return (
    <div className="min-h-screen gradient-bg pt-24 pb-16 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            About <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">NoticeBoard AI</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A digital notice board that uses artificial intelligence to differentiate it from a simple electronic notice board.
          </p>
        </div>

        {/* How NLP Works */}
        <div className="glass-strong p-8 mb-12">
          <h2 className="font-display text-2xl font-bold text-foreground mb-4">How NLP Powers This System</h2>
          <div className="space-y-4 text-muted-foreground">
            <p>When a notice is posted, the NLP engine performs the following steps:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li><strong className="text-foreground">Tokenization</strong> — The text is split into individual words (tokens).</li>
              <li><strong className="text-foreground">Stop Word Removal</strong> — Common words like "the", "is", "and" are filtered out to focus on meaningful content.</li>
              <li><strong className="text-foreground">Keyword Extraction</strong> — Relevant keywords are identified based on frequency and domain relevance.</li>
              <li><strong className="text-foreground">Priority Classification</strong> — Keywords are matched against urgency dictionaries to assign a priority level.</li>
              <li><strong className="text-foreground">Text Cleaning</strong> — Extra whitespace and special characters are normalized for better readability.</li>
            </ol>
          </div>
        </div>

        {/* Feature cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="glass-card">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default About;
