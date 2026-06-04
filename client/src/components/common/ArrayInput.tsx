import { useState } from 'react';
import { MdClose, MdAdd } from 'react-icons/md';

interface ArrayInputProps {
    value?: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
}

export default function ArrayInput({ value = [], onChange, placeholder, disabled }: ArrayInputProps) {
    const [input, setInput] = useState('');

    const handleAdd = () => {
        if (!input.trim()) return;
        onChange([...(value || []), input.trim()]);
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    const handleRemove = (index: number) => {
        const newValue = [...(value || [])];
        newValue.splice(index, 1);
        onChange(newValue);
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="flex-1 px-4 py-2 border border-divider rounded-xl outline-none focus:border-primary transition-colors bg-bg-paper text-text-primary"
                />
                <button
                    type="button"
                    onClick={handleAdd}
                    disabled={disabled || !input.trim()}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-xl transition-colors disabled:opacity-50 border-none cursor-pointer"
                >
                    <MdAdd size={20} />
                </button>
            </div>
            <div className="flex flex-wrap gap-2">
                {(value || []).map((item, index) => (
                    <div key={index} className="flex items-center gap-1 px-3 py-1 bg-gray-100 rounded-full text-sm text-text-primary">
                        <span>{item}</span>
                        <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            disabled={disabled}
                            className="p-0.5 hover:bg-gray-300 rounded-full text-text-secondary transition-colors cursor-pointer border-none bg-transparent flex items-center justify-center"
                        >
                            <MdClose size={14} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
