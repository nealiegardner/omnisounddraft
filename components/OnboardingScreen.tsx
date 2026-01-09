
import React, { useState } from 'react';
import { Target, Shield, Zap, ChevronRight, Fingerprint } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const steps = [
  {
    title: "Silent Operative",
    desc: "EarAI monitors your workspace in the background, listening for factual targets.",
    icon: <Shield size={48} className="text-ios-blue" />,
    color: "bg-ios-blue"
  },
  {
    title: "Intelligence Shards",
    desc: "When a target is identified, EarAI strikes with raw data shards—no fluff, just truth.",
    icon: <Zap size={48} className="text-ios-green" />,
    color: "bg-ios-green"
  },
  {
    title: "Knowledge Injection",
    desc: "Feed custom intelligence into the system. EarAI adapts to your specific project data.",
    icon: <Target size={48} className="text-ios-red" />,
    color: "bg-ios-red"
  }
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="h-screen w-full flex flex-col bg-white overflow-hidden font-sans">
      <div className="flex-1 flex flex-col items-center justify-center px-10 text-center space-y-8">
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl transition-all duration-700 ${steps[currentStep].color}/10 animate-in zoom-in-50`}>
          {steps[currentStep].icon}
        </div>
        
        <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl font-black tracking-tighter text-black">
            {steps[currentStep].title}
          </h1>
          <p className="text-ios-gray font-medium leading-relaxed">
            {steps[currentStep].desc}
          </p>
        </div>
      </div>

      <div className="safe-pb p-10 flex flex-col items-center gap-8">
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentStep ? 'w-8 bg-black' : 'w-1.5 bg-ios-gray/20'
              }`} 
            />
          ))}
        </div>

        <button 
          onClick={next}
          className="w-full h-16 bg-black text-white rounded-2xl flex items-center justify-center gap-2 font-black tracking-tight active:scale-95 transition-all shadow-xl"
        >
          {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
