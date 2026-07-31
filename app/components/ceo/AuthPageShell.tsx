import Image from 'next/image';

export default function AuthPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf8ec] px-4 py-10 dark:bg-[#111111]">
      {/* Brand header */}
      <div className="mb-7 flex flex-col items-center">
        <Image src="/AE-Logo.svg" alt="AE Hub" width={84} height={84} priority />
        <h1
          className="mt-2 font-bold tracking-tight text-[#1a1a1a] dark:text-white"
          style={{ fontSize: 28, lineHeight: '34px' }}
        >
          AE Hub
        </h1>
        <p
          className="mt-0.75 text-center font-medium"
          style={{ fontSize: 12, lineHeight: '18px', color: '#f5bd02', letterSpacing: '0.01em' }}
        >
          Agunwami Enterprise Professional Workspace Solution
        </p>
      </div>

      {children}

      <p className="mt-7 text-[11px]" style={{ color: '#f5bd02' }}>
        © Agunwami Enterprise. All rights reserved.
      </p>
    </div>
  );
}
