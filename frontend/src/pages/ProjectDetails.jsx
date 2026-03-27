import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Info, Bookmark, Share2 } from 'lucide-react';

export default function ProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 hover:text-blue-600 font-medium mb-6 transition">
        <ChevronLeft size={20} /> Back to Jobs
      </button>

      <div className="flex justify-between items-start mb-8 pb-8 border-b border-slate-100">
         <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">Founding Engineer (Voice AI)</h1>
            <p className="text-lg text-slate-600 mb-4">Investcode Private Limited</p>
            <div className="flex items-center gap-4 text-sm font-medium">
               <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-md">Actively Hiring</span>
               <span className="text-slate-500">Work from home</span>
               <span className="text-slate-500 flex items-center gap-1.5"><Info size={14}/> 2 applicants</span>
            </div>
         </div>
         <div className="flex gap-3">
            <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition">
               <Bookmark size={18}/>
            </button>
            <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:border-blue-200 transition">
               <Share2 size={18}/>
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-2.5 rounded-xl transition shadow-sm">
               Apply Now
            </button>
         </div>
      </div>

      <div className="space-y-8 text-slate-700 text-sm leading-relaxed">
         <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">About the work from home job/internship</h2>
            <p className="mb-2">Selected intern's day-to-day responsibilities include:</p>
            <ol className="list-decimal pl-5 space-y-2">
               <li>Build and improve voice-to-text pipelines for real-world calls</li>
               <li>Work on LLMs that understand, summarize, and extract insights from call transcripts</li>
               <li>Handle messy audio: accents, interruptions, low-quality calls, and domain-specific language</li>
               <li>
                 Design systems for:
                 <ul className="list-disc pl-5 mt-1">
                   <li>Speaker diarization</li>
                   <li>Call summarization and intent extraction</li>
                   <li>Real-time or near-real-time transcription</li>
                 </ul>
               </li>
               <li>Optimize latency, accuracy, and cost in production systems</li>
            </ol>
         </section>

         <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Skill(s) required</h2>
            <div className="flex flex-wrap gap-2 mb-3">
               <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md font-medium">LLMOps</span>
               <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md font-medium">Machine Learning</span>
               <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md font-medium">Natural Language Processing (NLP)</span>
            </div>
            <p className="text-slate-500 mb-2">Earn certifications in these skills</p>
            <div className="flex gap-4 text-blue-600 font-semibold cursor-pointer">
               <span className="hover:underline">Learn LLMOps</span>
               <span className="hover:underline">Learn Machine Learning</span>
               <span className="hover:underline">Learn NLP</span>
            </div>
         </section>

         <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Who can apply</h2>
            <p className="mb-2">Only those candidates can apply who:</p>
            <ol className="list-decimal pl-5 space-y-2">
               <li>are available for the work from home job/internship</li>
               <li>can start the work from home job/internship between 29th Jan'26 and 5th Mar'26</li>
               <li>are available for duration of 3 months</li>
               <li>have relevant skills and interests</li>
            </ol>
            <p className="mt-3 text-slate-500 italic">* Women wanting to start/restart their career can also apply.</p>
         </section>

         <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Other requirements</h2>
            <ol className="list-decimal pl-5 space-y-2">
               <li>Worked with ASR models (e.g., Whisper, Deepgram, Vosk, proprietary systems)</li>
               <li>Experience post-processing transcripts using LLMs</li>
               <li>
                 Familiarity with:
                 <ul className="list-none pl-4 mt-1 space-y-1">
                   <li>Speaker diarization</li>
                   <li>Timestamp alignment</li>
                   <li>Chunking and streaming audio/text</li>
                 </ul>
               </li>
               <li>Strong Python skills</li>
               <li>Fresher or 8th sem B.E/B. Tech in Computer Science or a related technical field</li>
               <li>Hands on experience working with voice or speech LLM systems</li>
               <li>Experience with call transcription use cases (sales calls, support calls, meetings, earnings calls, etc.)</li>
               <li>Strong fundamentals in ML, NLP, and system design</li>
            </ol>
         </section>

         <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">Perks</h2>
            <div className="flex gap-4">
               <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium">Letter of recommendation</span>
               <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium">Flexible work hours</span>
               <span className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-medium">5 days a week</span>
            </div>
         </section>

         <section>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Number of openings</h2>
            <p className="text-xl font-medium text-slate-600">3</p>
         </section>

         <section className="bg-slate-50 p-6 rounded-xl border border-slate-100 mt-8">
            <h2 className="text-xl font-bold text-slate-800 mb-4">About Investcode Private Limited</h2>
            <p className="mb-4">
              InvestKode AI is building AI-driven equities research tools that help users understand stocks and markets better using language models, real time data, and voice intelligence. We're a small, fast moving team (IIT+IIM), working in stealth model focused on shipping real products with strong engineering foundations. Our vision is to become the largest AI platform in India.
            </p>
            <ul className="space-y-2 font-medium text-slate-600">
               <li>Activity on Internshala</li>
               <li>Hiring since November 2025</li>
               <li>2 opportunities posted</li>
            </ul>
         </section>
      </div>
    </div>
  );
}
