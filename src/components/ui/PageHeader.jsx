export default function PageHeader({ title, subtitle, actions }) {
  return (
    <div
      className="
      flex
      flex-col
      md:flex-row
      md:items-center
      md:justify-between
      gap-4
      mb-6
    "
    >
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>

        {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <div>{actions}</div>
    </div>
  );
}
