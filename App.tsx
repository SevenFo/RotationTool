import React, { useState } from 'react';
import { RotationConverter } from './components/RotationConverter';
import { RotationCalculator } from './components/RotationCalculator';
import { Orbit, ArrowRightLeft, RefreshCw, Github } from 'lucide-react';

type Tab = 'converter' | 'calculator';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('converter');

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg shadow-indigo-200">
              <Orbit className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">RotationTool</h1>
              <p className="text-sm text-slate-500 font-medium">3D Orientation & Math Utility</p>
            </div>
          </div>
          <a 
            href="https://github.com/SevenFo/RotationTool" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-800 transition-colors p-2 hover:bg-slate-100 rounded-full"
            title="View source on GitHub"
          >
            <Github size={24} />
          </a>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('converter')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'converter' 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <RefreshCw size={16} />
            Converter
          </button>
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'calculator' 
                ? 'bg-slate-800 text-white shadow-md' 
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ArrowRightLeft size={16} />
            Calculator
          </button>
        </div>
      </header>
      
      <main>
        {activeTab === 'converter' ? (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">3D Rotation Converter</h2>
            </div>
            <RotationConverter />
          </section>
        ) : (
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-800">Quaternion Calculator</h2>
            </div>
            <RotationCalculator />
          </section>
        )}
      </main>

      <footer className="mt-12 pt-6 border-t border-slate-200 text-center text-slate-400 text-sm">
        <p>Built with React, Three.js & Tailwind CSS.</p>
        <p className="mt-1 text-xs">Matches Scipy <code>spatial.transform.Rotation</code> standards.</p>
      </footer>
    </div>
  );
};

export default App;