interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h2 className="text-3xl font-extrabold text-text-primary m-0">{title}</h2>
      {subtitle && <p className="text-sm text-text-secondary mt-1 m-0">{subtitle}</p>}
    </div>
  );
}
