import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Brain, Cloud, Sparkles } from 'lucide-react';
import NoticeCard from '@/components/NoticeCard';
import { sampleNotices } from '@/lib/sampleData';
import { analyzeNotice } from '@/lib/nlp';

const Home = () => {
  const [selectedNotice, setSelectedNotice] = useState<string | null>(null);

  const sortedNotices = [...sampleNotices].sort((a, b) => {
    const pa = analyzeNotice(a.title + ' ' + a.content).priority;
    const pb = analyzeNotice(b.title + ' ' + b.content).priority;
    const order = { urgent: 0, important: 1, normal: 2, low: 3 };
    return order[pa] - order[pb];
  });

  return (
    <div className="min-h-screen gradient-bg">
      {/* Hero */}
      <section className="pt-32 pb-16 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4 text-primary" />
            AI-Powered Notice Board
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Smart Notices,<br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Intelligent Priorities
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Our NLP-powered system automatically analyzes notices, extracts keywords, 
            and classifies urgency — so you never miss what matters.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/notifications" className="inline-flex items-center gap-2 gradient-primary text-primary-foreground px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all hover:scale-105">
              View Notices <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/about" className="inline-flex items-center gap-2 glass px-6 py-3 rounded-xl font-medium text-foreground hover:scale-105 transition-all">
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { icon: Brain, title: 'NLP Analysis', desc: 'Extracts keywords like "exam", "urgent", and "submission" to classify priority automatically.' },
            { icon: Bell, title: 'Smart Alerts', desc: 'Color-coded notices based on urgency. Never miss critical announcements again.' },
            { icon: Cloud, title: 'Cloud Powered', desc: 'Built on cloud services for real-time sync, authentication, and multi-user support.' },
          ].map((f, i) => (
            <div key={i} className="glass-card text-center animate-float" style={{ animationDelay: `${i * 0.5}s` }}>
              <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                <f.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest Notices */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-3xl font-bold text-foreground">Latest Notices</h2>
            <Link to="/notifications" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {sortedNotices.slice(0, 4).map(notice => (
              <NoticeCard key={notice.id} notice={notice} onClick={() => setSelectedNotice(notice.id)} />
            ))}
          </div>
        </div>
      </section>

      {/* Notice detail modal */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm" onClick={() => setSelectedNotice(null)}>
          <div className="glass-strong max-w-lg w-full p-8" onClick={e => e.stopPropagation()}>
            {(() => {
              const n = sampleNotices.find(n => n.id === selectedNotice)!;
              const nlp = analyzeNotice(n.title + ' ' + n.content);
              return (
                <>
                  <h2 className="font-display text-2xl font-bold text-foreground mb-4">{n.title}</h2>
                  <p className="text-muted-foreground mb-4">{nlp.cleanedText}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {nlp.keywords.map(k => (
                      <span key={k} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-lg">{k}</span>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">By {n.author} · {n.date} · {n.category}</p>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
