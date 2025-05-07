import { useState } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { 
  Network, 
  BarChart, 
  Calendar, 
  Tag, 
  MessageSquarePlus, 
  ChevronRight,
  ArrowRight,
  Star,
  Users,
  List,
  Search
} from 'lucide-react';

export default function LandingPage() {
  const [_, navigate] = useLocation();
  const [hoverFeature, setHoverFeature] = useState<string | null>(null);

  // Features list
  const features = [
    { 
      id: 'track',
      icon: <Network className="h-12 w-12 mb-4 text-primary" />, 
      title: 'Track Your Network', 
      description: 'Log and organize all your professional contacts in one place. Never forget a connection again.' 
    },
    { 
      id: 'notes',
      icon: <MessageSquarePlus className="h-12 w-12 mb-4 text-primary" />, 
      title: 'Detailed Notes', 
      description: 'Keep comprehensive notes on every interaction and conversation to build stronger relationships.' 
    },
    { 
      id: 'tags',
      icon: <Tag className="h-12 w-12 mb-4 text-primary" />, 
      title: 'Smart Tags', 
      description: 'Organize contacts with custom tags to quickly filter and find the connections you need.' 
    },
    { 
      id: 'reminders',
      icon: <Calendar className="h-12 w-12 mb-4 text-primary" />, 
      title: 'Follow-ups', 
      description: 'Never miss an opportunity to reconnect with important contacts at the right time.' 
    }
  ];

  return (
    <>
      <Helmet>
        <title>Track Connections | Build Your Professional Network</title>
        <meta name="description" content="A mobile-first web application for logging and organizing professional connections made at conferences and events." />
      </Helmet>

      {/* Navigation */}
      <nav className="fixed w-full top-0 z-50 bg-background border-b border-border">
        <div className="container mx-auto px-4 md:px-6 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Network className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">TrackConnections</span>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth#register')}>
              Get Started
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="md:w-1/2 md:pr-8 mb-8 md:mb-0">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Build Your Professional Network <span className="text-primary">That Matters</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-6">
                Track, organize, and follow up with important connections you make at conferences, meetings, and networking events.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button size="lg" onClick={() => navigate('/auth#register')} className="bg-primary hover:bg-primary/90">
                  Create Free Account
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => {
                  const featuresSection = document.getElementById('features');
                  featuresSection?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Explore Features
                </Button>
              </div>
            </div>
            <div className="md:w-1/2 rounded-lg overflow-hidden shadow-2xl">
              <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-lg">
                {/* Stylized preview of the app */}
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
                  <div className="flex items-center mb-4">
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium">My Connections</h3>
                      <p className="text-blue-100 text-sm">12 new connections this week</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/10 rounded-md p-3">
                      <Star className="h-5 w-5 text-yellow-300 mb-1" />
                      <h4 className="text-white text-sm font-medium">Favorites</h4>
                      <p className="text-blue-100 text-xs">8 contacts</p>
                    </div>
                    <div className="bg-white/10 rounded-md p-3">
                      <List className="h-5 w-5 text-green-300 mb-1" />
                      <h4 className="text-white text-sm font-medium">Recent</h4>
                      <p className="text-blue-100 text-xs">15 contacts</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/10 rounded-md p-3 mb-3">
                    <div className="flex items-center mb-2">
                      <Search className="h-4 w-4 text-blue-100 mr-2" />
                      <div className="text-blue-100 text-sm">Search connections...</div>
                    </div>
                  </div>
                  
                  {/* Sample contacts */}
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white/5 rounded-md p-2 flex items-center">
                        <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 mr-2"></div>
                        <div className="flex-1">
                          <h5 className="text-white text-sm font-medium">Contact {i}</h5>
                          <p className="text-blue-100 text-xs truncate">Met at Tech Conference 2025</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Manage Your Network</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Track Connections gives you powerful tools to build and maintain your professional relationships.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div 
                key={feature.id}
                className={`bg-background p-6 rounded-xl border border-border transition-all duration-300 ${
                  hoverFeature === feature.id ? 'shadow-lg border-primary/50 -translate-y-1' : 'shadow'
                }`}
                onMouseEnter={() => setHoverFeature(feature.id)}
                onMouseLeave={() => setHoverFeature(null)}
              >
                {feature.icon}
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start organizing your professional network in minutes with our simple workflow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-12">
            {[
              {
                step: '01',
                title: 'Create an Account',
                description: 'Sign up for a free account to start tracking your professional connections.'
              },
              {
                step: '02',
                title: 'Log Your Connections',
                description: 'Record details about people you meet at events, conferences, and meetings.'
              },
              {
                step: '03',
                title: 'Stay Connected',
                description: 'Set reminders for follow-ups and never miss an opportunity to strengthen relationships.'
              }
            ].map((item, i) => (
              <div key={i} className="relative">
                <div className="text-6xl font-bold text-gray-100 dark:text-gray-800 absolute -top-8 left-0">
                  {item.step}
                </div>
                <div className="relative z-10">
                  <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-white">
        <div className="container mx-auto px-4 md:px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Build Your Professional Network?</h2>
          <p className="text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
            Join thousands of professionals who use Track Connections to organize and grow their network.
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            onClick={() => navigate('/auth#register')}
            className="bg-white text-primary hover:bg-blue-50"
          >
            Get Started for Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Network className="h-5 w-5 text-primary" />
              <span className="font-bold">TrackConnections</span>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Track Connections. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}