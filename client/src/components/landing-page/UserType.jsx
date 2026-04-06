import { Award } from 'lucide-react';
import { Rocket } from 'lucide-react';
import { Users } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { CheckCircle } from 'lucide-react';

const userTypes = [
    {
        title: "For Students",
        description: "Have an idea but don't know where to start? Get matched with mentors, find co-founders, and turn your vision into reality with expert guidance.",
        icon: <Award className="w-12 h-12" />,
        benefits: ["Find experienced mentors", "Connect with co-founders", "Learn from successful founders", "Access startup resources"]
    },
    {
        title: "For Early-Stage Founders",
        description: "Already building? Find the perfect co-founder to fill skill gaps, connect with investors, and get mentorship to accelerate your growth.",
        icon: <Rocket className="w-12 h-12" />,
        benefits: ["Smart co-founder matching", "Direct investor access", "Expert mentorship", "Track your progress"]
    },
    {
        title: "For Mentors",
        description: "Share your expertise with the next generation. Get matched with founders who need your specific skills and experience.",
        icon: <Users className="w-12 h-12" />,
        benefits: ["Give back to community", "Build your network", "Stay connected to innovation", "Flexible scheduling"]
    },
    {
        title: "For Investors",
        description: "Discover pre-vetted startups that match your investment criteria. Connect directly with founders and make informed decisions.",
        icon: <TrendingUp className="w-12 h-12" />,
        benefits: ["AI-curated deal flow", "Direct founder access", "Track investments", "Portfolio management"]
    }
];

export default function UserType() {
    return (
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4">
                        Built for Everyone in the Startup Ecosystem
                    </h2>
                    <p className="text-xl text-slate-600 max-w-3xl mx-auto">
                        Whether you're a student with an idea, a founder building a company, a mentor sharing expertise, or an investor seeking opportunities — Scale Scope is designed for you.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {userTypes.map((type, idx) => (
                        <div key={idx} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-100">
                            <div className="text-indigo-600 mb-4">{type.icon}</div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">{type.title}</h3>
                            <p className="text-slate-600 mb-6">{type.description}</p>
                            <ul className="space-y-3">
                                {type.benefits.map((benefit, bidx) => (
                                    <li key={bidx} className="flex items-center gap-3 text-slate-700">
                                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        <span>{benefit}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
