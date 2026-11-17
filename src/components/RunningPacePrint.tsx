'use client'

export interface RunningPrintSnapshot {
  title: string
  distance: string
  headers: readonly string[]
  summary: readonly string[]
  rows: readonly { distance: string; values: readonly string[] }[]
}

/** Full click-time rows. Screen pagination never feeds this print-only document. */
export default function RunningPacePrint({ snapshot }: { snapshot: RunningPrintSnapshot }) {
  return <section data-running-print-document className="hidden print:block text-fg">
    <style media="print">{`
      body:has([data-running-print-document]) *:not([data-running-print-document]):not([data-running-print-document] *):not(:has([data-running-print-document])) {
        display: none !important;
      }
      body:has([data-running-print-document]),
      body:has([data-running-print-document]) :has([data-running-print-document]) {
        display: block !important;
        margin: 0 !important;
        padding: 0 !important;
        min-height: 0 !important;
        height: auto !important;
        max-width: none !important;
        overflow: visible !important;
      }
    `}</style>
    <h1 className="text-2xl font-bold">{snapshot.title}</h1>
    <p className="my-3">{snapshot.distance}</p>
    {snapshot.summary.map((line, index) => <p key={index} className="text-sm">{line}</p>)}
    <table className="mt-4 w-full border-collapse text-left text-sm tabular-nums">
      <thead><tr>{snapshot.headers.map((header, index) => <th key={index} scope="col" className="border-b border-line p-2">{header}</th>)}</tr></thead>
      <tbody>{snapshot.rows.map((row, index) => <tr key={index} data-running-print-row className="break-inside-avoid"><th scope="row" className="border-b border-line p-2 font-normal">{row.distance}</th>{row.values.map((value, column) => <td key={column} className="border-b border-line p-2">{value}</td>)}</tr>)}</tbody>
    </table>
  </section>
}
