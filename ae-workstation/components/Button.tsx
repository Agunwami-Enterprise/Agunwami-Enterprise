// TODO (Stage 2): Replace with pixel-accurate Button variants from Figma design tokens.
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
}

export default function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={[
        'rounded px-4 py-2 text-sm font-medium transition-colors',
        variant === 'primary' && 'bg-black text-white hover:bg-gray-800',
        variant === 'secondary' && 'border border-gray-300 text-gray-700 hover:bg-gray-50',
        variant === 'ghost' && 'text-gray-600 hover:bg-gray-100',
        props.className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  );
}
