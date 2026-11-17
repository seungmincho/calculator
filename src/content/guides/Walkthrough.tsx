import readings from './walkthroughs.json'

type Section = {
  heading: string
  paragraphs: string[]
  table?: { caption: string; columns: string[]; rows: string[][] }
  source?: { href: string; label: string }
}

export const walkthroughs: Record<string, Section[] | undefined> = readings

export default function Walkthrough({ sections }: { sections: Section[] }) {
  return (
    <div className="space-y-9 text-body">
      {sections.map(({ heading, paragraphs, table, source }) => (
        <section key={heading}>
          <h2 className="mb-3 text-xl font-bold text-fg">{heading}</h2>
          {paragraphs.map(text => <p key={text} className="mt-3 leading-8">{text}</p>)}
          {table && (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm tabular-nums">
                <caption className="pb-2 text-left font-semibold text-fg">{table.caption}</caption>
                <thead><tr className="border-b border-line">
                  {table.columns.map(column => <th key={column} scope="col" className="py-2 pr-3">{column}</th>)}
                </tr></thead>
                <tbody>{table.rows.map(([label, ...values]) => <tr key={label} className="border-b border-line">
                  <th scope="row" className="py-2 pr-3 font-medium">{label}</th>
                  {values.map((value, i) => <td key={table.columns[i + 1]} className="py-2 pr-3">{value}</td>)}
                </tr>)}</tbody>
              </table>
            </div>
          )}
          {source && <a className="mt-3 inline-block text-sm text-primary underline" href={source.href}>{source.label}</a>}
        </section>
      ))}
    </div>
  )
}
