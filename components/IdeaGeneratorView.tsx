
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Sparkles, Wand2 } from 'lucide-react';
import { generateIdeas } from '../services/geminiService';

const IdeaGeneratorView: React.FC = () => {
    const navigate = useNavigate();
    const [topic, setTopic] = useState('');
    const [ideas, setIdeas] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError('Please enter a topic to brainstorm.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setIdeas('');
        try {
            const result = await generateIdeas(topic);
            setIdeas(result);
        } catch (err) {
            console.error(err);
            const errorMessage = (err instanceof Error) ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate ideas. ${errorMessage}`);
        } finally {
            setIsLoading(false);
        }
    };

    const apiKeyMissing = !process.env.API_KEY;

    return (
        <motion.div
            className="flex flex-col h-full text-white"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.3 }}
        >
            <header className="flex items-center p-4">
                <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <h2 className="text-2xl font-bold ml-4 flex items-center gap-2">
                    <Sparkles className="text-yellow-400" />
                    Idea Generator
                </h2>
            </header>
            <div className="flex-grow flex flex-col overflow-hidden px-4 pb-4 gap-4">
                <p className="text-sm text-white/70">
                    Powered by Gemini, this tool can help you brainstorm new features or ideas for this app. What should we think about?
                </p>

                {apiKeyMissing ? (
                    <div className="flex-grow flex items-center justify-center text-center bg-yellow-900/30 text-yellow-300 p-4 rounded-xl">
                        <p>A Google AI API key is required for this feature. Please set it up in your environment variables to enable the Idea Generator.</p>
                    </div>
                ) : (
                    <>
                        <div className="flex flex-col gap-2">
                            <textarea
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="e.g., 'new categories' or 'security features'"
                                className="w-full bg-[#2a2a4a] border border-transparent focus:border-indigo-500 focus:ring-indigo-500 rounded-lg px-3 py-2 transition-colors resize-none"
                                rows={3}
                                disabled={isLoading}
                            />
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold disabled:bg-gray-500 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        >
                                            <Wand2 size={20} />
                                        </motion.div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Wand2 size={20} />
                                        Generate Ideas
                                    </>
                                )}
                            </button>
                        </div>
                        <div className="flex-grow bg-black/20 rounded-xl p-4 overflow-y-auto">
                            {error && <p className="text-red-400">{error}</p>}
                            {ideas ? (
                                <pre className="text-sm whitespace-pre-wrap font-sans">{ideas}</pre>
                            ) : (
                                !isLoading && <p className="text-white/50">Your generated ideas will appear here...</p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </motion.div>
    );
};

export default IdeaGeneratorView;
